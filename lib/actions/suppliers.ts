"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new Error("Only an admin can manage suppliers");
  return user;
}

function readSupplierFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    openingBalance: Number(formData.get("openingBalance") ?? 0),
  };
}

export async function createSupplier(formData: FormData) {
  const user = await requireAdmin();
  const fields = readSupplierFields(formData);
  if (!fields.name) throw new Error("Name is required");

  const [created] = await db.insert(suppliers).values(fields).returning();

  await logAudit({
    actorId: user.id,
    action: "supplier.create",
    entity: "suppliers",
    entityId: created.id,
    after: created,
  });

  redirect("/dashboard/purchases/suppliers");
}

export async function updateSupplier(id: number, formData: FormData) {
  const user = await requireAdmin();
  const fields = readSupplierFields(formData);
  if (!fields.name) throw new Error("Name is required");

  const [before] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  const [after] = await db.update(suppliers).set(fields).where(eq(suppliers.id, id)).returning();

  await logAudit({
    actorId: user.id,
    action: "supplier.update",
    entity: "suppliers",
    entityId: id,
    before,
    after,
  });

  redirect("/dashboard/purchases/suppliers");
}

export async function setSupplierActive(id: number, active: boolean) {
  const user = await requireAdmin();
  const [before] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  const [after] = await db
    .update(suppliers)
    .set({ active })
    .where(eq(suppliers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: active ? "supplier.activate" : "supplier.deactivate",
    entity: "suppliers",
    entityId: id,
    before,
    after,
  });

  redirect("/dashboard/purchases/suppliers");
}
