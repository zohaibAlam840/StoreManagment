import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, invoices, payments } from "@/lib/db/schema";

// Balance and last-delivery-date are always derived from invoices/payments,
// never stored redundantly, so they can't drift out of sync with the ledger.
export async function getCustomerBalanceBefore(customerId: number, before: Date): Promise<number> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return 0;

  const [invoiceTotal] = await db
    .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, "posted"),
        lt(invoices.date, before)
      )
    );

  const [paymentTotal] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.customerId, customerId), lt(payments.date, before)));

  return customer.openingBalance + (invoiceTotal?.total ?? 0) - (paymentTotal?.total ?? 0);
}

export async function getCustomerCurrentBalance(customerId: number): Promise<number> {
  return getCustomerBalanceBefore(customerId, new Date(Date.now() + 1000));
}

export async function getLastDeliveryDateBefore(customerId: number, before: Date): Promise<Date | null> {
  const [row] = await db
    .select({ date: invoices.date })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, "posted"),
        lt(invoices.date, before)
      )
    )
    .orderBy(sql`${invoices.date} desc`)
    .limit(1);
  return row?.date ?? null;
}

export async function getLastDeliveryDate(customerId: number): Promise<Date | null> {
  return getLastDeliveryDateBefore(customerId, new Date(Date.now() + 1000));
}

export type CustomerLedgerEntry = {
  date: Date;
  description: string;
  debit: number; // increases what the customer owes
  credit: number; // decreases what the customer owes
  runningBalance: number;
};

// Chronological invoices + payments for one customer, so the ledger always
// matches the same balance calculation used everywhere else (invoices,
// receivables report), rather than a separately-maintained statement.
export async function getCustomerLedger(customerId: number): Promise<CustomerLedgerEntry[]> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return [];

  const invoiceRows = await db
    .select({ date: invoices.date, number: invoices.number, total: invoices.total })
    .from(invoices)
    .where(and(eq(invoices.customerId, customerId), eq(invoices.status, "posted")));

  const paymentRows = await db
    .select({ date: payments.date, amount: payments.amount, mode: payments.mode })
    .from(payments)
    .where(eq(payments.customerId, customerId));

  type Raw = { date: Date; description: string; debit: number; credit: number };
  const raw: Raw[] = [
    ...invoiceRows.map((r) => ({
      date: r.date,
      description: `Invoice #${r.number}`,
      debit: r.total,
      credit: 0,
    })),
    ...paymentRows.map((r) => ({
      date: r.date,
      description: `Payment received (${r.mode.replace("_", " ")})`,
      debit: 0,
      credit: r.amount,
    })),
  ];
  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = customer.openingBalance;
  return raw.map((r) => {
    running += r.debit - r.credit;
    return { ...r, runningBalance: running };
  });
}
