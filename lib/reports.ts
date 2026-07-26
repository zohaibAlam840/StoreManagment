import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  invoices,
  invoiceLines,
  customers,
  products,
  purchases,
  cashTransactions,
} from "@/lib/db/schema";
import { getStockOnHandMany } from "@/lib/inventory";
import { getCustomerBalanceBefore } from "@/lib/customers";

async function getPostedInvoicesInRange(from: Date, to: Date) {
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      date: invoices.date,
      total: invoices.total,
      customerId: invoices.customerId,
      customerName: customers.name,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, from), lt(invoices.date, to)));
}

function periodKey(date: Date, groupBy: "day" | "week" | "month") {
  if (groupBy === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (groupBy === "week") {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export async function getSalesByPeriod(from: Date, to: Date, groupBy: "day" | "week" | "month") {
  const rows = await getPostedInvoicesInRange(from, to);
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = periodKey(r.date, groupBy);
    map.set(key, (map.get(key) ?? 0) + r.total);
  }
  return Array.from(map.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getSalesByCustomer(from: Date, to: Date) {
  const rows = await getPostedInvoicesInRange(from, to);
  const map = new Map<string, { customerName: string; total: number }>();
  for (const r of rows) {
    const key = r.customerName ?? "—";
    const existing = map.get(key) ?? { customerName: key, total: 0 };
    existing.total += r.total;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getSalesByProduct(from: Date, to: Date) {
  const rows = await db
    .select({
      productName: products.name,
      qty: invoiceLines.qty,
      rate: invoiceLines.rate,
      date: invoices.date,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .leftJoin(products, eq(invoiceLines.productId, products.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, from), lt(invoices.date, to)));

  const map = new Map<string, { productName: string; qty: number; total: number }>();
  for (const r of rows) {
    const key = r.productName ?? "—";
    const existing = map.get(key) ?? { productName: key, qty: 0, total: 0 };
    existing.qty += r.qty;
    existing.total += r.qty * r.rate;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getStockValuation() {
  const allProducts = await db.select().from(products).where(eq(products.active, true));
  const stockMap = await getStockOnHandMany(allProducts.map((p) => p.id));
  const rows = allProducts.map((p) => {
    const stock = stockMap.get(p.id) ?? 0;
    return { productName: p.name, stock, costPrice: p.costPrice, value: stock * p.costPrice };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  return { rows, totalValue };
}

type ProfitRow = { revenue: number; cost: number; gp: number };

export async function getProfitByProduct(from: Date, to: Date) {
  const rows = await db
    .select({
      productName: products.name,
      qty: invoiceLines.qty,
      rate: invoiceLines.rate,
      costAtSale: invoiceLines.costAtSale,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .leftJoin(products, eq(invoiceLines.productId, products.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, from), lt(invoices.date, to)));

  const map = new Map<string, ProfitRow>();
  for (const r of rows) {
    const key = r.productName ?? "—";
    const existing = map.get(key) ?? { revenue: 0, cost: 0, gp: 0 };
    const revenue = r.qty * r.rate;
    const cost = r.qty * r.costAtSale;
    existing.revenue += revenue;
    existing.cost += cost;
    existing.gp += revenue - cost;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([productName, v]) => ({ productName, ...v }))
    .sort((a, b) => b.gp - a.gp);
}

export async function getProfitByInvoice(from: Date, to: Date) {
  const rows = await db
    .select({
      invoiceId: invoices.id,
      number: invoices.number,
      customerName: customers.name,
      qty: invoiceLines.qty,
      rate: invoiceLines.rate,
      costAtSale: invoiceLines.costAtSale,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, from), lt(invoices.date, to)));

  const map = new Map<number, { number: number; customerName: string; revenue: number; cost: number; gp: number }>();
  for (const r of rows) {
    const existing = map.get(r.invoiceId) ?? {
      number: r.number,
      customerName: r.customerName ?? "—",
      revenue: 0,
      cost: 0,
      gp: 0,
    };
    const revenue = r.qty * r.rate;
    const cost = r.qty * r.costAtSale;
    existing.revenue += revenue;
    existing.cost += cost;
    existing.gp += revenue - cost;
    map.set(r.invoiceId, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.number - b.number);
}

export async function getProfitByCustomer(from: Date, to: Date) {
  const rows = await db
    .select({
      customerName: customers.name,
      qty: invoiceLines.qty,
      rate: invoiceLines.rate,
      costAtSale: invoiceLines.costAtSale,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, from), lt(invoices.date, to)));

  const map = new Map<string, ProfitRow>();
  for (const r of rows) {
    const key = r.customerName ?? "—";
    const existing = map.get(key) ?? { revenue: 0, cost: 0, gp: 0 };
    const revenue = r.qty * r.rate;
    const cost = r.qty * r.costAtSale;
    existing.revenue += revenue;
    existing.cost += cost;
    existing.gp += revenue - cost;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([customerName, v]) => ({ customerName, ...v }))
    .sort((a, b) => b.gp - a.gp);
}

// Net Profit = Gross Profit minus period operating expenses: purchase-side
// freight/loading/other (captured on each purchase) plus ad-hoc cash/bank
// outflows recorded in Cash Management (rent, utilities, etc.). Supplier
// payments themselves settle a payable and aren't a period expense on their
// own, so they're intentionally excluded here.
export async function getNetProfit(from: Date, to: Date) {
  const productProfit = await getProfitByProduct(from, to);
  const grossProfit = productProfit.reduce((s, r) => s + r.gp, 0);

  const purchaseRows = await db
    .select()
    .from(purchases)
    .where(and(gte(purchases.date, from), lt(purchases.date, to)));
  const purchaseExpenses = purchaseRows.reduce(
    (s, p) => s + p.freight + p.loadingUnloading + p.otherExpenses,
    0
  );

  const cashOutRows = await db
    .select()
    .from(cashTransactions)
    .where(and(eq(cashTransactions.direction, "out"), gte(cashTransactions.date, from), lt(cashTransactions.date, to)));
  const otherExpenses = cashOutRows.reduce((s, r) => s + r.amount, 0);

  return {
    grossProfit,
    purchaseExpenses,
    otherExpenses,
    netProfit: grossProfit - purchaseExpenses - otherExpenses,
  };
}

export async function getReceivables() {
  const allCustomers = await db.select().from(customers).where(eq(customers.active, true));
  const now = new Date(Date.now() + 1000);
  const rows = await Promise.all(
    allCustomers.map(async (c) => ({
      id: c.id,
      name: c.name,
      creditLimit: c.creditLimit,
      balance: await getCustomerBalanceBefore(c.id, now),
    }))
  );
  return rows
    .filter((r) => r.balance !== 0)
    .map((r) => ({ ...r, overLimit: r.creditLimit != null && r.balance > r.creditLimit }))
    .sort((a, b) => b.balance - a.balance);
}
