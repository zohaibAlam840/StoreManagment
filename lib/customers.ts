import "server-only";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, invoices, invoiceLines, payments, salesReturns } from "@/lib/db/schema";

// Net of invoices minus payments/returns before a given date — the piece of
// the balance calc that doesn't require the customer row, so callers that
// already have it (e.g. the invoice form, which just fetched the customer)
// can skip re-querying it.
async function getBalanceDelta(customerId: number, before: Date): Promise<number> {
  const [[invoiceTotal], [paymentTotal], [returnTotal]] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        and(eq(invoices.customerId, customerId), eq(invoices.status, "posted"), lt(invoices.date, before))
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.customerId, customerId), lt(payments.date, before))),
    db
      .select({ total: sql<number>`coalesce(sum(${salesReturns.total}), 0)` })
      .from(salesReturns)
      .where(and(eq(salesReturns.customerId, customerId), lt(salesReturns.date, before))),
  ]);
  return (invoiceTotal?.total ?? 0) - (paymentTotal?.total ?? 0) - (returnTotal?.total ?? 0);
}

// Balance and last-delivery-date are always derived from invoices/payments,
// never stored redundantly, so they can't drift out of sync with the ledger.
export async function getCustomerBalanceBefore(customerId: number, before: Date): Promise<number> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return 0;
  const delta = await getBalanceDelta(customerId, before);
  return customer.openingBalance + delta;
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

// Fetches everything the invoice form needs about a customer in one batch of
// parallel queries instead of several round trips in sequence — the
// dominant cost of "select customer, wait" was serialized network latency,
// not the queries themselves.
export async function getCustomerInvoiceContext(customerId: number, at: Date) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return null;

  const [balanceDelta, lastDeliveryDate] = await Promise.all([
    getBalanceDelta(customerId, at),
    getLastDeliveryDateBefore(customerId, at),
  ]);

  return {
    customer,
    previousBalance: customer.openingBalance + balanceDelta,
    lastDeliveryDate,
  };
}

// The rate this customer was actually charged last time, per product — used
// so invoicing suggests "what we sold this to them for before" instead of
// falling back to the list price the moment no admin-configured special
// rate exists (requirement: rate memory, not just a manually maintained
// rate table).
export async function getLastChargedRates(customerId: number): Promise<Record<number, number>> {
  const rows = await db
    .select({ productId: invoiceLines.productId, rate: invoiceLines.rate })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .where(and(eq(invoices.customerId, customerId), eq(invoices.status, "posted")))
    .orderBy(desc(invoices.date));

  const result: Record<number, number> = {};
  for (const row of rows) {
    if (!(row.productId in result)) result[row.productId] = row.rate;
  }
  return result;
}

export type CustomerLedgerEntry = {
  date: Date;
  description: string;
  debit: number; // increases what the customer owes
  credit: number; // decreases what the customer owes
  runningBalance: number;
};

// Chronological invoices + payments + returns for one customer, so the
// ledger always matches the same balance calculation used everywhere else
// (invoices, receivables report), rather than a separately-maintained
// statement.
export async function getCustomerLedger(customerId: number): Promise<CustomerLedgerEntry[]> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return [];

  const [invoiceRows, paymentRows, returnRows] = await Promise.all([
    db
      .select({ date: invoices.date, number: invoices.number, total: invoices.total })
      .from(invoices)
      .where(and(eq(invoices.customerId, customerId), eq(invoices.status, "posted"))),
    db
      .select({ date: payments.date, amount: payments.amount, mode: payments.mode })
      .from(payments)
      .where(eq(payments.customerId, customerId)),
    db
      .select({ date: salesReturns.date, number: salesReturns.number, total: salesReturns.total })
      .from(salesReturns)
      .where(eq(salesReturns.customerId, customerId)),
  ]);

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
    ...returnRows.map((r) => ({
      date: r.date,
      description: `Sale return #${r.number}`,
      debit: 0,
      credit: r.total,
    })),
  ];
  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = customer.openingBalance;
  return raw.map((r) => {
    running += r.debit - r.credit;
    return { ...r, runningBalance: running };
  });
}
