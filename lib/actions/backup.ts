"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { logAudit } from "@/lib/audit";
import {
  users,
  customers,
  customerRates,
  products,
  invoices,
  invoiceLines,
  stockLedger,
  payments,
  suppliers,
  purchaseOrders,
  purchaseOrderLines,
  purchases,
  purchaseLines,
  supplierPayments,
  cashTransactions,
  cashClosings,
  approvalRequests,
  auditLog,
} from "@/lib/db/schema";

export type RestoreState = { error: string } | { success: true } | undefined;

// Date-typed columns come back from JSON as strings; drizzle's timestamp
// columns need real Date objects on insert, so each table lists which of its
// fields to revive.
const DATE_FIELDS: Record<string, string[]> = {
  users: ["createdAt"],
  suppliers: ["createdAt"],
  customers: ["createdAt"],
  products: ["createdAt"],
  customerRates: ["updatedAt"],
  cashClosings: ["date", "createdAt"],
  cashTransactions: ["date", "createdAt"],
  supplierPayments: ["date", "createdAt"],
  payments: ["date", "createdAt"],
  stockLedger: ["createdAt"],
  purchaseOrders: ["date", "createdAt"],
  purchases: ["date", "createdAt"],
  purchaseOrderLines: [],
  purchaseLines: [],
  invoices: ["date", "createdAt"],
  invoiceLines: [],
  approvalRequests: ["resolvedAt", "createdAt"],
  auditLog: ["at"],
};

function revive(tableName: string, rows: Record<string, unknown>[]) {
  const fields = DATE_FIELDS[tableName] ?? [];
  if (fields.length === 0) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of fields) {
      if (copy[field]) copy[field] = new Date(copy[field] as string);
    }
    return copy;
  });
}

// Restore is a full replace, in FK-safe order: children deleted before
// parents, then parents inserted before children. Audit log is included
// (rather than left alone) because its actorId references users, so leaving
// old rows in place while replacing users would violate the FK constraint.
export async function restoreBackup(
  _state: RestoreState,
  formData: FormData
): Promise<RestoreState> {
  const admin = await getCurrentUser();
  if (admin.role !== "admin") return { error: "Only an admin can restore a backup" };

  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "RESTORE") {
    return { error: 'Type RESTORE (all caps) in the confirmation box to proceed.' };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Choose a backup JSON file first." };
  }

  let parsed: { tables?: Record<string, Record<string, unknown>[]> };
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: "That file isn't valid JSON." };
  }

  const t = parsed.tables;
  if (!t) return { error: "That file doesn't look like a backup export." };

  await db.delete(auditLog);
  await db.delete(approvalRequests);
  await db.delete(invoiceLines);
  await db.delete(invoices);
  await db.delete(purchaseLines);
  await db.delete(purchaseOrderLines);
  await db.delete(purchases);
  await db.delete(purchaseOrders);
  await db.delete(stockLedger);
  await db.delete(payments);
  await db.delete(supplierPayments);
  await db.delete(cashTransactions);
  await db.delete(cashClosings);
  await db.delete(customerRates);
  await db.delete(products);
  await db.delete(customers);
  await db.delete(suppliers);
  await db.delete(users);

  if (t.users?.length) await db.insert(users).values(revive("users", t.users) as never);
  if (t.auditLog?.length) await db.insert(auditLog).values(revive("auditLog", t.auditLog) as never);
  if (t.suppliers?.length) await db.insert(suppliers).values(revive("suppliers", t.suppliers) as never);
  if (t.customers?.length) await db.insert(customers).values(revive("customers", t.customers) as never);
  if (t.products?.length) await db.insert(products).values(revive("products", t.products) as never);
  if (t.customerRates?.length) await db.insert(customerRates).values(revive("customerRates", t.customerRates) as never);
  if (t.cashClosings?.length) await db.insert(cashClosings).values(revive("cashClosings", t.cashClosings) as never);
  if (t.cashTransactions?.length) await db.insert(cashTransactions).values(revive("cashTransactions", t.cashTransactions) as never);
  if (t.supplierPayments?.length) await db.insert(supplierPayments).values(revive("supplierPayments", t.supplierPayments) as never);
  if (t.payments?.length) await db.insert(payments).values(revive("payments", t.payments) as never);
  if (t.stockLedger?.length) await db.insert(stockLedger).values(revive("stockLedger", t.stockLedger) as never);
  if (t.purchaseOrders?.length) await db.insert(purchaseOrders).values(revive("purchaseOrders", t.purchaseOrders) as never);
  if (t.purchases?.length) await db.insert(purchases).values(revive("purchases", t.purchases) as never);
  if (t.purchaseOrderLines?.length) await db.insert(purchaseOrderLines).values(revive("purchaseOrderLines", t.purchaseOrderLines) as never);
  if (t.purchaseLines?.length) await db.insert(purchaseLines).values(revive("purchaseLines", t.purchaseLines) as never);
  if (t.invoices?.length) await db.insert(invoices).values(revive("invoices", t.invoices) as never);
  if (t.invoiceLines?.length) await db.insert(invoiceLines).values(revive("invoiceLines", t.invoiceLines) as never);
  if (t.approvalRequests?.length) await db.insert(approvalRequests).values(revive("approvalRequests", t.approvalRequests) as never);

  await logAudit({
    actorId: admin.id,
    action: "backup.restore",
    entity: "system",
  });

  return { success: true };
}
