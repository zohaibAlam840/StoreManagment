"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { customers, customerRates } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Only an admin can manage customers");
  }
  return user;
}

function readCustomerFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    openingBalance: Number(formData.get("openingBalance") ?? 0),
    creditLimit: formData.get("creditLimit") ? Number(formData.get("creditLimit")) : null,
  };
}

export type QuickCreateCustomerResult =
  | { id: number; name: string; phone: string | null }
  | { error: string };

// Lets a salesman add a walk-in customer without leaving the invoice screen —
// deliberately open to both roles (unlike the full customer-management
// actions below) since blocking a new customer's first sale on "an admin
// has to set them up first" defeats the point of a quick counter sale. Only
// name + phone are captured; an admin can fill in address/credit limit/etc.
// later via the full Customers page if needed.
export async function quickCreateCustomer(name: string, phone: string): Promise<QuickCreateCustomerResult> {
  const user = await getCurrentUser();
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Customer name is required" };

  const [created] = await db
    .insert(customers)
    .values({ name: trimmedName, phone: phone.trim() || null })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "customer.create",
    entity: "customers",
    entityId: created.id,
    after: created,
  });

  return { id: created.id, name: created.name, phone: created.phone };
}

export async function createCustomer(formData: FormData) {
  const user = await requireAdmin();
  const fields = readCustomerFields(formData);
  if (!fields.name) throw new Error("Name is required");

  const [created] = await db.insert(customers).values(fields).returning();

  await logAudit({
    actorId: user.id,
    action: "customer.create",
    entity: "customers",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

export type ImportCustomersState = { error: string } | { success: true; count: number } | undefined;

// Bulk customer import — matches the "name,phone,address,openingBalance,
// creditLimit" columns the CSV export produces. Unlike product import (which
// upserts by SKU), every row here is always inserted as a new customer:
// customers have no reliable natural key, and two real customers can
// legitimately share a name, so matching-by-name risks silently merging
// distinct people's balances.
export async function importCustomersCsv(
  _state: ImportCustomersState,
  formData: FormData
): Promise<ImportCustomersState> {
  const user = await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a CSV file first." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "That CSV has no data rows." };

  const header = rows[0].map((h) => h.trim());
  if (!header.includes("name")) return { error: 'CSV is missing required column "name"' };

  let count = 0;
  for (const row of rows.slice(1)) {
    const record: Record<string, string> = {};
    header.forEach((col, i) => (record[col] = row[i] ?? ""));

    const name = record.name?.trim();
    if (!name) continue;

    await db.insert(customers).values({
      name,
      phone: record.phone?.trim() || null,
      address: record.address?.trim() || null,
      openingBalance: Number(record.openingBalance) || 0,
      creditLimit: record.creditLimit ? Number(record.creditLimit) : null,
    });
    count++;
  }

  await logAudit({
    actorId: user.id,
    action: "customer.import_csv",
    entity: "customers",
    after: { count },
  });

  revalidatePath("/dashboard/customers");
  return { success: true, count };
}

export async function updateCustomer(id: number, formData: FormData) {
  const user = await requireAdmin();
  const fields = readCustomerFields(formData);
  if (!fields.name) throw new Error("Name is required");

  const [before] = await db.select().from(customers).where(eq(customers.id, id));
  const [after] = await db
    .update(customers)
    .set(fields)
    .where(eq(customers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: "customer.update",
    entity: "customers",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

export async function setCustomerActive(id: number, active: boolean) {
  const user = await requireAdmin();
  const [before] = await db.select().from(customers).where(eq(customers.id, id));
  const [after] = await db
    .update(customers)
    .set({ active })
    .where(eq(customers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: active ? "customer.activate" : "customer.deactivate",
    entity: "customers",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

// Rate reductions require admin approval per requirement #10. Since only
// admins can reach this action at all (salesmen have no access to this
// page), every call here is already admin-approved at the point of entry;
// the approval queue is wired up for salesman-initiated rate changes in
// Phase 5 once such a flow exists.
export async function setCustomerRate(customerId: number, productId: number, formData: FormData) {
  const user = await requireAdmin();
  const rate = Number(formData.get("rate") ?? 0);

  const [existing] = await db
    .select()
    .from(customerRates)
    .where(and(eq(customerRates.customerId, customerId), eq(customerRates.productId, productId)));

  const [after] = existing
    ? await db
        .update(customerRates)
        .set({ rate, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(customerRates.id, existing.id))
        .returning()
    : await db
        .insert(customerRates)
        .values({ customerId, productId, rate, updatedBy: user.id })
        .returning();

  await logAudit({
    actorId: user.id,
    action: existing ? "customer_rate.update" : "customer_rate.create",
    entity: "customer_rates",
    entityId: after.id,
    before: existing,
    after,
  });

  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}

export async function deleteCustomerRate(customerId: number, rateId: number) {
  const user = await requireAdmin();
  const [before] = await db.select().from(customerRates).where(eq(customerRates.id, rateId));

  await db.delete(customerRates).where(eq(customerRates.id, rateId));

  await logAudit({
    actorId: user.id,
    action: "customer_rate.delete",
    entity: "customer_rates",
    entityId: rateId,
    before,
  });

  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}
