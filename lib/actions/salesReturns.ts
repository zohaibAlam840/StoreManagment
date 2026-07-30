"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, invoiceLines, salesReturns, salesReturnLines } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordStockMovement } from "@/lib/inventory";
import { logAudit } from "@/lib/audit";

export type SalesReturnLineInput = { productId: number; qty: number };

export type CreateSalesReturnResult = { id: number } | { error: string };

// Credits the customer at the same rate/cost the item was originally sold
// at (never re-negotiated), restores stock, and stands as its own document
// referencing the invoice — the original sale's history is never mutated.
export async function createSalesReturn(
  invoiceId: number,
  lines: SalesReturnLineInput[],
  reason: string
): Promise<CreateSalesReturnResult> {
  const user = await getCurrentUser();

  if (lines.length === 0) return { error: "Select at least one item to return" };

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice || invoice.status !== "posted") {
    return { error: "That invoice isn't available to return against" };
  }

  const originalLines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
  const originalByProduct = new Map(originalLines.map((l) => [l.productId, l]));

  const alreadyReturnedRows = await db
    .select({ productId: salesReturnLines.productId, qty: salesReturnLines.qty })
    .from(salesReturnLines)
    .innerJoin(salesReturns, eq(salesReturnLines.salesReturnId, salesReturns.id))
    .where(eq(salesReturns.invoiceId, invoiceId));
  const alreadyReturnedByProduct = new Map<number, number>();
  for (const row of alreadyReturnedRows) {
    alreadyReturnedByProduct.set(row.productId, (alreadyReturnedByProduct.get(row.productId) ?? 0) + row.qty);
  }

  for (const line of lines) {
    const original = originalByProduct.get(line.productId);
    if (!original) return { error: `That product wasn't on invoice #${invoice.number}` };

    const alreadyReturned = alreadyReturnedByProduct.get(line.productId) ?? 0;
    const remaining = original.qty - alreadyReturned;
    if (line.qty > remaining) {
      return { error: `Can't return more than ${remaining} of that item (already sold ${original.qty}, returned ${alreadyReturned})` };
    }
    if (line.qty <= 0) return { error: "Return quantity must be greater than zero" };
  }

  let subtotal = 0;
  const enrichedLines = lines.map((l) => {
    const original = originalByProduct.get(l.productId)!;
    subtotal += l.qty * original.rate;
    return { productId: l.productId, qty: l.qty, rate: original.rate, costAtSale: original.costAtSale };
  });
  const total = subtotal;

  const [{ maxNumber } = { maxNumber: 0 }] = await db
    .select({ maxNumber: sql<number>`coalesce(max(${salesReturns.number}), 0)` })
    .from(salesReturns);
  const number = (maxNumber ?? 0) + 1;

  const [salesReturn] = await db
    .insert(salesReturns)
    .values({
      number,
      invoiceId,
      customerId: invoice.customerId,
      reason: reason || null,
      subtotal,
      total,
      createdBy: user.id,
    })
    .returning();

  for (const line of enrichedLines) {
    await db.insert(salesReturnLines).values({
      salesReturnId: salesReturn.id,
      productId: line.productId,
      qty: line.qty,
      rate: line.rate,
      costAtSale: line.costAtSale,
    });

    await recordStockMovement({
      productId: line.productId,
      type: "return",
      qty: line.qty,
      refType: "sales_return",
      refId: salesReturn.id,
      createdBy: user.id,
    });
  }

  await logAudit({
    actorId: user.id,
    action: "sales_return.create",
    entity: "sales_returns",
    entityId: salesReturn.id,
    after: salesReturn,
  });

  return { id: salesReturn.id };
}

export async function getReturnsForInvoice(invoiceId: number) {
  const rows = await db
    .select({
      id: salesReturns.id,
      number: salesReturns.number,
      date: salesReturns.date,
      total: salesReturns.total,
      reason: salesReturns.reason,
    })
    .from(salesReturns)
    .where(eq(salesReturns.invoiceId, invoiceId));
  return rows;
}
