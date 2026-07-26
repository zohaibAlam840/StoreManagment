import { NextResponse } from "next/server";
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

// Every table gets backed up (including password hashes, so a restore can
// actually log back in) — this file should be stored securely, not shared.
export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can export a backup" }, { status: 403 });
  }

  const [
    usersRows,
    customersRows,
    customerRatesRows,
    productsRows,
    invoicesRows,
    invoiceLinesRows,
    stockLedgerRows,
    paymentsRows,
    suppliersRows,
    purchaseOrdersRows,
    purchaseOrderLinesRows,
    purchasesRows,
    purchaseLinesRows,
    supplierPaymentsRows,
    cashTransactionsRows,
    cashClosingsRows,
    approvalRequestsRows,
    auditLogRows,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(customers),
    db.select().from(customerRates),
    db.select().from(products),
    db.select().from(invoices),
    db.select().from(invoiceLines),
    db.select().from(stockLedger),
    db.select().from(payments),
    db.select().from(suppliers),
    db.select().from(purchaseOrders),
    db.select().from(purchaseOrderLines),
    db.select().from(purchases),
    db.select().from(purchaseLines),
    db.select().from(supplierPayments),
    db.select().from(cashTransactions),
    db.select().from(cashClosings),
    db.select().from(approvalRequests),
    db.select().from(auditLog),
  ]);

  await logAudit({
    actorId: user.id,
    action: "backup.export",
    entity: "system",
  });

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      users: usersRows,
      customers: customersRows,
      customerRates: customerRatesRows,
      products: productsRows,
      invoices: invoicesRows,
      invoiceLines: invoiceLinesRows,
      stockLedger: stockLedgerRows,
      payments: paymentsRows,
      suppliers: suppliersRows,
      purchaseOrders: purchaseOrdersRows,
      purchaseOrderLines: purchaseOrderLinesRows,
      purchases: purchasesRows,
      purchaseLines: purchaseLinesRows,
      supplierPayments: supplierPaymentsRows,
      cashTransactions: cashTransactionsRows,
      cashClosings: cashClosingsRows,
      approvalRequests: approvalRequestsRows,
      auditLog: auditLogRows,
    },
  };

  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
