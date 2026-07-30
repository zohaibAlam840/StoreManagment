"use server";

import bcrypt from "bcryptjs";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, customerRates, invoices, invoiceLines, products, users, payments } from "@/lib/db/schema";
import type { PaymentMode } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStockOnHandMany, recordStockMovement } from "@/lib/inventory";
import { getCustomerInvoiceContext, getLastChargedRates } from "@/lib/customers";
import { logAudit } from "@/lib/audit";
import { requestApproval } from "@/lib/approvals";

export type GetInvoiceFormDataResult =
  | {
      customer: typeof customers.$inferSelect;
      previousBalance: number;
      lastDeliveryDate: string | null;
      rates: Record<number, number>;
    }
  | { error: string };

// Rate suggestion priority: an admin-configured customer rate wins when set,
// otherwise the last rate this customer was actually charged for that
// product, otherwise the list price — so switching customers doesn't
// silently reset a running discount back to minSellingPrice.
export async function getInvoiceFormData(customerId: number): Promise<GetInvoiceFormDataResult> {
  await getCurrentUser();
  const now = new Date();

  const [context, rateRows, lastChargedRates] = await Promise.all([
    getCustomerInvoiceContext(customerId, now),
    db
      .select({ productId: customerRates.productId, rate: customerRates.rate })
      .from(customerRates)
      .where(eq(customerRates.customerId, customerId)),
    getLastChargedRates(customerId),
  ]);

  if (!context) return { error: "Customer not found" };

  return {
    customer: context.customer,
    previousBalance: context.previousBalance,
    lastDeliveryDate: context.lastDeliveryDate ? context.lastDeliveryDate.toISOString() : null,
    rates: { ...lastChargedRates, ...Object.fromEntries(rateRows.map((r) => [r.productId, r.rate])) },
  };
}

export type InvoiceLineInput = { productId: number; qty: number; rate: number };
export type CreateInvoiceInput = {
  customerId: number;
  paymentMode: PaymentMode;
  discountAmount: number;
  lines: InvoiceLineInput[];
  // Payment/Receipt section on the invoice itself: how much of the total was
  // actually collected right now (defaults to 0 = fully on credit) and how.
  amountReceived?: number;
  receivedMode?: PaymentMode;
};

export type PerformCreateInvoiceResult = { id: number } | { error: string };

// Shared by the direct (admin) path and the approval-executed path so a
// below-threshold sale approved later is created with identical logic to one
// an admin enters directly, instead of duplicating the invoice-creation rules.
//
// Returns a structured error instead of throwing: Next.js redacts thrown
// Server Action error messages in production builds (replacing them with a
// generic "Server Components render" message), so validation failures like
// "not enough stock" must be returned, not thrown, to actually reach the user.
export async function performCreateInvoice(
  actorId: number,
  input: CreateInvoiceInput
): Promise<PerformCreateInvoiceResult> {
  if (input.lines.length === 0) {
    return { error: "Add at least one product to the invoice" };
  }

  const productIds = input.lines.map((l) => l.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const stockByProduct = await getStockOnHandMany(productIds);
  for (const line of input.lines) {
    const stock = stockByProduct.get(line.productId) ?? 0;
    if (line.qty > stock) {
      const name = productById.get(line.productId)?.name ?? `#${line.productId}`;
      return { error: `Not enough stock for ${name}: only ${stock} available` };
    }
  }

  // Duplicate-invoice guard: same customer + same total by the same user
  // within the last 15 seconds is almost certainly an accidental double-submit.
  const subtotal = input.lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
  const total = subtotal - input.discountAmount;

  const fifteenSecondsAgo = new Date(Date.now() - 15_000);
  const [possibleDuplicate] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, input.customerId),
        eq(invoices.createdBy, actorId),
        eq(invoices.total, total),
        eq(invoices.status, "posted"),
        gt(invoices.createdAt, fifteenSecondsAgo)
      )
    );
  if (possibleDuplicate) {
    return {
      error: `This looks like a duplicate of invoice #${possibleDuplicate.number} created moments ago. Refresh the invoice list to confirm before resubmitting.`,
    };
  }

  const [{ maxNumber } = { maxNumber: 0 }] = await db
    .select({ maxNumber: sql<number>`coalesce(max(${invoices.number}), 0)` })
    .from(invoices);
  const number = (maxNumber ?? 0) + 1;

  const [invoice] = await db
    .insert(invoices)
    .values({
      number,
      customerId: input.customerId,
      paymentMode: input.paymentMode,
      discountAmount: input.discountAmount,
      subtotal,
      total,
      status: "posted",
      createdBy: actorId,
    })
    .returning();

  for (const line of input.lines) {
    const product = productById.get(line.productId);
    if (!product) continue;

    await db.insert(invoiceLines).values({
      invoiceId: invoice.id,
      productId: line.productId,
      qty: line.qty,
      rate: line.rate,
      costAtSale: product.costPrice,
    });

    await recordStockMovement({
      productId: line.productId,
      type: "sale",
      qty: -line.qty,
      refType: "invoice",
      refId: invoice.id,
      createdBy: actorId,
    });
  }

  // Payment/Receipt section: record whatever was actually collected now
  // against this specific invoice, leaving the rest on the customer's
  // running balance instead of forcing every sale to be all-cash or
  // all-credit.
  const amountReceived = Math.max(0, Math.min(input.amountReceived ?? 0, total));
  if (amountReceived > 0) {
    await db.insert(payments).values({
      customerId: input.customerId,
      invoiceId: invoice.id,
      amount: amountReceived,
      mode: input.receivedMode ?? (input.paymentMode === "credit" ? "cash" : input.paymentMode),
      createdBy: actorId,
    });
  }

  await logAudit({
    actorId,
    action: "invoice.create",
    entity: "invoices",
    entityId: invoice.id,
    after: { ...invoice, amountReceived },
  });

  return { id: invoice.id };
}

export type CreateInvoiceResult =
  | { id: number }
  | { pending: true; approvalId: number }
  | { error: string };

async function findBelowThresholdLine(input: CreateInvoiceInput) {
  const productIds = input.lines.map((l) => l.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const line = input.lines.find((l) => {
    const product = productById.get(l.productId);
    return product && l.rate < product.minSellingPrice;
  });

  return { line, productById };
}

// Below-cost and below-minimum-margin sales require admin approval
// (requirement #10). Two paths satisfy that: an admin on-site can type their
// password right now to authorize it immediately (adminOverride), or —
// without one — it's queued for an admin to approve later. An admin entering
// the sale themselves needs neither, since they ARE the approver.
export async function createInvoice(
  input: CreateInvoiceInput,
  adminOverride?: { username: string; password: string }
): Promise<CreateInvoiceResult> {
  const user = await getCurrentUser();

  if (input.lines.length === 0) {
    return { error: "Add at least one product to the invoice" };
  }

  const { line: belowThresholdLine, productById } = await findBelowThresholdLine(input);

  if (belowThresholdLine && user.role !== "admin") {
    if (adminOverride) {
      const verify = await verifyAdminCredentials(adminOverride.username, adminOverride.password);
      if ("error" in verify) return { error: verify.error };

      const result = await performCreateInvoice(user.id, input);
      if ("error" in result) return result;

      await logAudit({
        actorId: user.id,
        action: "invoice.admin_override",
        entity: "invoices",
        entityId: result.id,
        after: { authorizedBy: verify.admin.id, authorizedByUsername: verify.admin.username },
      });
      return result;
    }

    const product = productById.get(belowThresholdLine.productId);
    const reason =
      product && belowThresholdLine.rate < product.costPrice
        ? `Selling ${product.name} below cost (rate ${belowThresholdLine.rate}, cost ${product.costPrice})`
        : `Selling ${product?.name ?? "a product"} below minimum margin (rate ${belowThresholdLine.rate}, minimum ${product?.minSellingPrice})`;

    const request = await requestApproval({
      type: "invoice.create",
      payload: input,
      reason,
      requestedBy: user.id,
    });
    return { pending: true, approvalId: request.id };
  }

  return performCreateInvoice(user.id, input);
}

export type VerifyAdminResult = { admin: { id: number; username: string } } | { error: string };

// Manager-override check: confirms the given credentials belong to an
// active admin, without creating a session for them — the salesman stays
// logged in as themselves, just authorized for this one action.
export async function verifyAdminCredentials(username: string, password: string): Promise<VerifyAdminResult> {
  if (!username || !password) return { error: "Enter an admin username and password" };

  const [account] = await db.select().from(users).where(eq(users.username, username));
  if (!account || !account.active || account.role !== "admin") {
    return { error: "Invalid admin credentials" };
  }

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) return { error: "Invalid admin credentials" };

  return { admin: { id: account.id, username: account.username } };
}

export type PerformVoidInvoiceResult = { voided: true } | { error: string };

// Reverses the stock movements from the original sale and marks the invoice
// void, rather than deleting the row, so financial history stays intact.
export async function performVoidInvoice(
  invoiceId: number,
  actorId: number
): Promise<PerformVoidInvoiceResult> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "void") return { voided: true };

  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
  for (const line of lines) {
    await recordStockMovement({
      productId: line.productId,
      type: "sale",
      qty: line.qty,
      refType: "invoice-void",
      refId: invoiceId,
      createdBy: actorId,
    });
  }

  const [after] = await db
    .update(invoices)
    .set({ status: "void" })
    .where(eq(invoices.id, invoiceId))
    .returning();

  await logAudit({
    actorId,
    action: "invoice.void",
    entity: "invoices",
    entityId: invoiceId,
    before: invoice,
    after,
  });

  return { voided: true };
}

export type VoidInvoiceResult =
  | { voided: true }
  | { pending: true; approvalId: number }
  | { error: string };

// Voiding/undoing a posted invoice requires admin approval (requirement #10)
// when requested by a salesman; an admin can void directly.
export async function voidInvoice(invoiceId: number, reason: string): Promise<VoidInvoiceResult> {
  const user = await getCurrentUser();

  if (user.role === "admin") {
    return performVoidInvoice(invoiceId, user.id);
  }

  const request = await requestApproval({
    type: "invoice.void",
    payload: { invoiceId },
    reason: reason || "Salesman requested invoice void",
    requestedBy: user.id,
  });
  return { pending: true, approvalId: request.id };
}

// --- Drafts (requirement #2: handle interrupted / simultaneous invoices) ---

export type DraftPayload = {
  customerId: number | null;
  paymentMode: PaymentMode;
  discountAmount: number;
  lines: InvoiceLineInput[];
};

export type SaveDraftResult = { id: number } | { error: string };

// Drafts are scoped to whoever created them — the point is letting one
// salesman juggle two customers at the counter, not a shared shop-wide queue.
export async function saveDraft(draftId: number | null, payload: DraftPayload): Promise<SaveDraftResult> {
  const user = await getCurrentUser();
  if (!payload.customerId) return { error: "Select a customer before saving a draft" };

  const subtotal = payload.lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
  const total = subtotal - payload.discountAmount;

  if (draftId) {
    const [existing] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, draftId), eq(invoices.status, "draft"), eq(invoices.createdBy, user.id)));
    if (existing) {
      await db
        .update(invoices)
        .set({
          customerId: payload.customerId ?? existing.customerId,
          paymentMode: payload.paymentMode,
          discountAmount: payload.discountAmount,
          subtotal,
          total,
          draftPayload: payload,
        })
        .where(eq(invoices.id, draftId));
      return { id: draftId };
    }
  }

  const [created] = await db
    .insert(invoices)
    .values({
      number: null,
      customerId: payload.customerId,
      paymentMode: payload.paymentMode,
      discountAmount: payload.discountAmount,
      subtotal,
      total,
      status: "draft",
      draftPayload: payload,
      createdBy: user.id,
    })
    .returning();

  return { id: created.id };
}

export async function listDrafts() {
  const user = await getCurrentUser();
  const rows = await db
    .select({
      id: invoices.id,
      customerId: invoices.customerId,
      customerName: customers.name,
      total: invoices.total,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(eq(invoices.status, "draft"), eq(invoices.createdBy, user.id)))
    .orderBy(desc(invoices.createdAt));
  return rows;
}

export async function getDraft(draftId: number): Promise<DraftPayload & { id: number } | null> {
  const user = await getCurrentUser();
  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, draftId), eq(invoices.status, "draft"), eq(invoices.createdBy, user.id)));
  if (!row || !row.draftPayload) return null;
  return { id: row.id, ...(row.draftPayload as DraftPayload) };
}

export async function deleteDraft(draftId: number): Promise<void> {
  const user = await getCurrentUser();
  await db
    .delete(invoices)
    .where(and(eq(invoices.id, draftId), eq(invoices.status, "draft"), eq(invoices.createdBy, user.id)));
}

// Finalizing runs the exact same validation/stock-deduction path as a normal
// invoice, then deletes the now-superseded draft row.
export async function finalizeDraft(
  draftId: number,
  input: CreateInvoiceInput,
  adminOverride?: { username: string; password: string }
): Promise<CreateInvoiceResult> {
  const result = await createInvoice(input, adminOverride);
  if ("id" in result) {
    const user = await getCurrentUser();
    await db
      .delete(invoices)
      .where(and(eq(invoices.id, draftId), eq(invoices.status, "draft"), eq(invoices.createdBy, user.id)));
  }
  return result;
}
