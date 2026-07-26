import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { suppliers, purchases, supplierPayments } from "@/lib/db/schema";

// Mirrors lib/customers.ts: balance is always derived from purchases/payments,
// never stored redundantly.
export async function getSupplierBalanceBefore(supplierId: number, before: Date): Promise<number> {
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
  if (!supplier) return 0;

  const [purchaseTotal] = await db
    .select({ total: sql<number>`coalesce(sum(${purchases.total}), 0)` })
    .from(purchases)
    .where(and(eq(purchases.supplierId, supplierId), lt(purchases.date, before)));

  const [paymentTotal] = await db
    .select({ total: sql<number>`coalesce(sum(${supplierPayments.amount}), 0)` })
    .from(supplierPayments)
    .where(and(eq(supplierPayments.supplierId, supplierId), lt(supplierPayments.date, before)));

  return supplier.openingBalance + (purchaseTotal?.total ?? 0) - (paymentTotal?.total ?? 0);
}

export async function getSupplierCurrentBalance(supplierId: number): Promise<number> {
  return getSupplierBalanceBefore(supplierId, new Date(Date.now() + 1000));
}
