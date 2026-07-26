"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { customers, customerRates } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";

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

  redirect("/dashboard/customers");
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
