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

export type SupplierLedgerEntry = {
  date: Date;
  description: string;
  debit: number; // decreases what we owe (payments made)
  credit: number; // increases what we owe (purchases)
  runningBalance: number;
};

// Mirrors lib/customers.ts getCustomerLedger: chronological purchases +
// payments for one supplier, matching the same balance calculation used
// everywhere else (Suppliers list, Purchases).
export async function getSupplierLedger(supplierId: number): Promise<SupplierLedgerEntry[]> {
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
  if (!supplier) return [];

  const [purchaseRows, paymentRows] = await Promise.all([
    db
      .select({ date: purchases.date, number: purchases.number, total: purchases.total })
      .from(purchases)
      .where(eq(purchases.supplierId, supplierId)),
    db
      .select({ date: supplierPayments.date, amount: supplierPayments.amount, mode: supplierPayments.mode })
      .from(supplierPayments)
      .where(eq(supplierPayments.supplierId, supplierId)),
  ]);

  type Raw = { date: Date; description: string; debit: number; credit: number };
  const raw: Raw[] = [
    ...purchaseRows.map((r) => ({
      date: r.date,
      description: `Purchase #${r.number}`,
      debit: 0,
      credit: r.total,
    })),
    ...paymentRows.map((r) => ({
      date: r.date,
      description: `Payment made (${r.mode.replace("_", " ")})`,
      debit: r.amount,
      credit: 0,
    })),
  ];
  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = supplier.openingBalance;
  return raw.map((r) => {
    running += r.credit - r.debit;
    return { ...r, runningBalance: running };
  });
}
