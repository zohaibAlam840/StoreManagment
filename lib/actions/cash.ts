"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { payments, supplierPayments, cashTransactions, cashClosings } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { getCurrentCashBalance } from "@/lib/cash";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new Error("Only an admin can manage cash records");
  return user;
}

export async function recordPayment(formData: FormData) {
  const user = await requireAdmin();
  const customerId = Number(formData.get("customerId"));
  const amount = Number(formData.get("amount"));
  const mode = String(formData.get("mode") ?? "cash") as "cash" | "credit" | "bank_transfer";

  if (!customerId || amount <= 0) throw new Error("Select a customer and a positive amount");

  const [created] = await db.insert(payments).values({ customerId, amount, mode, createdBy: user.id }).returning();

  await logAudit({
    actorId: user.id,
    action: "payment.create",
    entity: "payments",
    entityId: created.id,
    after: created,
  });

  redirect("/dashboard/cash");
}

export async function recordSupplierPayment(formData: FormData) {
  const user = await requireAdmin();
  const supplierId = Number(formData.get("supplierId"));
  const amount = Number(formData.get("amount"));
  const mode = String(formData.get("mode") ?? "cash") as "cash" | "credit" | "bank_transfer";

  if (!supplierId || amount <= 0) throw new Error("Select a supplier and a positive amount");

  const [created] = await db
    .insert(supplierPayments)
    .values({ supplierId, amount, mode, createdBy: user.id })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "supplier_payment.create",
    entity: "supplier_payments",
    entityId: created.id,
    after: created,
  });

  redirect("/dashboard/cash");
}

export async function recordCashTransaction(formData: FormData) {
  const user = await requireAdmin();
  const direction = String(formData.get("direction") ?? "out") as "in" | "out";
  const mode = String(formData.get("mode") ?? "cash") as "cash" | "bank_transfer";
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (amount <= 0 || !category) throw new Error("Enter a category and a positive amount");

  const [created] = await db
    .insert(cashTransactions)
    .values({ direction, mode, amount, category, note, createdBy: user.id })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "cash_transaction.create",
    entity: "cash_transactions",
    entityId: created.id,
    after: created,
  });

  redirect("/dashboard/cash");
}

export async function createCashClosing(formData: FormData) {
  const user = await requireAdmin();
  const countedCash = Number(formData.get("countedCash"));
  const note = String(formData.get("note") ?? "").trim() || null;

  const expectedCash = await getCurrentCashBalance("cash");
  const variance = countedCash - expectedCash;

  const [created] = await db
    .insert(cashClosings)
    .values({ expectedCash, countedCash, variance, note, createdBy: user.id })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "cash_closing.create",
    entity: "cash_closings",
    entityId: created.id,
    after: created,
  });

  redirect("/dashboard/cash/closing");
}
