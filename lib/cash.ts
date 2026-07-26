import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  invoices,
  customers,
  payments,
  suppliers,
  supplierPayments,
  cashTransactions,
  type CashMode,
} from "@/lib/db/schema";

export type CashLedgerEntry = {
  date: Date;
  description: string;
  direction: "in" | "out";
  amount: number;
};

// Cash book and bank book are both derived from the same underlying data
// (invoices, customer/supplier payments, ad-hoc transactions) filtered by
// payment mode, rather than kept as separately-maintained ledgers that could
// drift out of sync with the actual sales/purchase records.
async function getAllEntries(mode: CashMode): Promise<CashLedgerEntry[]> {
  const invoiceRows = await db
    .select({
      date: invoices.date,
      total: invoices.total,
      number: invoices.number,
      customerName: customers.name,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(eq(invoices.paymentMode, mode), eq(invoices.status, "posted")));

  const paymentRows = await db
    .select({ date: payments.date, amount: payments.amount, customerName: customers.name })
    .from(payments)
    .leftJoin(customers, eq(payments.customerId, customers.id))
    .where(eq(payments.mode, mode));

  const supplierPaymentRows = await db
    .select({ date: supplierPayments.date, amount: supplierPayments.amount, supplierName: suppliers.name })
    .from(supplierPayments)
    .leftJoin(suppliers, eq(supplierPayments.supplierId, suppliers.id))
    .where(eq(supplierPayments.mode, mode));

  const transactionRows = await db
    .select()
    .from(cashTransactions)
    .where(eq(cashTransactions.mode, mode));

  const entries: CashLedgerEntry[] = [
    ...invoiceRows.map((r) => ({
      date: r.date,
      description: `Invoice #${r.number} — ${r.customerName ?? "customer"}`,
      direction: "in" as const,
      amount: r.total,
    })),
    ...paymentRows.map((r) => ({
      date: r.date,
      description: `Payment received — ${r.customerName ?? "customer"}`,
      direction: "in" as const,
      amount: r.amount,
    })),
    ...supplierPaymentRows.map((r) => ({
      date: r.date,
      description: `Payment to supplier — ${r.supplierName ?? "supplier"}`,
      direction: "out" as const,
      amount: r.amount,
    })),
    ...transactionRows.map((r) => ({
      date: r.date,
      description: `${r.category}${r.note ? ` — ${r.note}` : ""}`,
      direction: r.direction,
      amount: r.amount,
    })),
  ];

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return entries;
}

export async function getCashBook(mode: CashMode, from: Date, to: Date) {
  const all = await getAllEntries(mode);

  let openingBalance = 0;
  const rows: (CashLedgerEntry & { runningBalance: number })[] = [];
  let running = 0;

  for (const entry of all) {
    const signed = entry.direction === "in" ? entry.amount : -entry.amount;
    if (entry.date < from) {
      openingBalance += signed;
      running += signed;
      continue;
    }
    if (entry.date >= to) continue;
    running += signed;
    rows.push({ ...entry, runningBalance: running });
  }

  const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.amount, 0);

  return {
    openingBalance,
    entries: rows,
    totalIn,
    totalOut,
    closingBalance: openingBalance + totalIn - totalOut,
  };
}

export async function getCurrentCashBalance(mode: CashMode): Promise<number> {
  const all = await getAllEntries(mode);
  return all.reduce((sum, e) => sum + (e.direction === "in" ? e.amount : -e.amount), 0);
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(24, 0, 0, 0);
  return d;
}
