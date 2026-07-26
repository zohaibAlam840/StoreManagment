"use server";

import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, customerRates, invoices, invoiceLines, products } from "@/lib/db/schema";
import type { PaymentMode } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStockOnHandMany, recordStockMovement } from "@/lib/inventory";
import { getCustomerBalanceBefore, getLastDeliveryDateBefore } from "@/lib/customers";
import { logAudit } from "@/lib/audit";
import { requestApproval } from "@/lib/approvals";

export async function getInvoiceFormData(customerId: number) {
  await getCurrentUser();
  const now = new Date();

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) throw new Error("Customer not found");

  const rateRows = await db
    .select({ productId: customerRates.productId, rate: customerRates.rate })
    .from(customerRates)
    .where(eq(customerRates.customerId, customerId));

  const previousBalance = await getCustomerBalanceBefore(customerId, now);
  const lastDeliveryDate = await getLastDeliveryDateBefore(customerId, now);

  return {
    customer,
    previousBalance,
    lastDeliveryDate: lastDeliveryDate ? lastDeliveryDate.toISOString() : null,
    rates: Object.fromEntries(rateRows.map((r) => [r.productId, r.rate])),
  };
}

export type InvoiceLineInput = { productId: number; qty: number; rate: number };
export type CreateInvoiceInput = {
  customerId: number;
  paymentMode: PaymentMode;
  discountAmount: number;
  lines: InvoiceLineInput[];
};

// Shared by the direct (admin) path and the approval-executed path so a
// below-threshold sale approved later is created with identical logic to one
// an admin enters directly, instead of duplicating the invoice-creation rules.
export async function performCreateInvoice(actorId: number, input: CreateInvoiceInput) {
  if (input.lines.length === 0) {
    throw new Error("Add at least one product to the invoice");
  }

  const productIds = input.lines.map((l) => l.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const stockByProduct = await getStockOnHandMany(productIds);
  for (const line of input.lines) {
    const stock = stockByProduct.get(line.productId) ?? 0;
    if (line.qty > stock) {
      const name = productById.get(line.productId)?.name ?? `#${line.productId}`;
      throw new Error(`Not enough stock for ${name}: only ${stock} available`);
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
        gt(invoices.createdAt, fifteenSecondsAgo)
      )
    );
  if (possibleDuplicate) {
    throw new Error(
      `This looks like a duplicate of invoice #${possibleDuplicate.number} created moments ago. Refresh the invoice list to confirm before resubmitting.`
    );
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

  await logAudit({
    actorId,
    action: "invoice.create",
    entity: "invoices",
    entityId: invoice.id,
    after: invoice,
  });

  return { id: invoice.id };
}

// Below-cost and below-minimum-margin sales require admin approval
// (requirement #10). An admin entering the sale IS the approver, so only a
// salesman's below-threshold line gets queued instead of completed directly.
export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ id: number; pending?: false } | { pending: true; approvalId: number }> {
  const user = await getCurrentUser();

  if (input.lines.length === 0) {
    throw new Error("Add at least one product to the invoice");
  }

  const productIds = input.lines.map((l) => l.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const belowThresholdLine = input.lines.find((line) => {
    const product = productById.get(line.productId);
    return product && line.rate < product.minSellingPrice;
  });

  if (belowThresholdLine && user.role !== "admin") {
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

  const result = await performCreateInvoice(user.id, input);
  return { id: result.id };
}

// Reverses the stock movements from the original sale and marks the invoice
// void, rather than deleting the row, so financial history stays intact.
export async function performVoidInvoice(invoiceId: number, actorId: number) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "void") return;

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
}

// Voiding/undoing a posted invoice requires admin approval (requirement #10)
// when requested by a salesman; an admin can void directly.
export async function voidInvoice(invoiceId: number, reason: string) {
  const user = await getCurrentUser();

  if (user.role === "admin") {
    await performVoidInvoice(invoiceId, user.id);
    return { voided: true as const };
  }

  const request = await requestApproval({
    type: "invoice.void",
    payload: { invoiceId },
    reason: reason || "Salesman requested invoice void",
    requestedBy: user.id,
  });
  return { pending: true as const, approvalId: request.id };
}
