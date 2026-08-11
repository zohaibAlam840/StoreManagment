"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Only an admin can manage products");
  }
  return user;
}

async function saveImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/products/${filename}`;
}

function readProductFields(formData: FormData) {
  return {
    sku: String(formData.get("sku") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    packingUnit: String(formData.get("packingUnit") ?? "").trim() || null,
    company: String(formData.get("company") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "pcs").trim() || "pcs",
    costPrice: Number(formData.get("costPrice") ?? 0),
    minSellingPrice: Number(formData.get("minSellingPrice") ?? 0),
    minStock: Number(formData.get("minStock") ?? 0),
    maxStock: formData.get("maxStock") ? Number(formData.get("maxStock")) : null,
    reorderLevel: Number(formData.get("reorderLevel") ?? 0),
  };
}

export async function createProduct(formData: FormData) {
  const user = await requireAdmin();
  const fields = readProductFields(formData);

  if (!fields.sku || !fields.name) {
    throw new Error("SKU and name are required");
  }

  const imageUrl = await saveImage(formData.get("image") as File | null);

  const [created] = await db
    .insert(products)
    .values({ ...fields, imageUrl })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "product.create",
    entity: "products",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const user = await requireAdmin();
  const fields = readProductFields(formData);

  if (!fields.sku || !fields.name) {
    throw new Error("SKU and name are required");
  }

  const [before] = await db.select().from(products).where(eq(products.id, id));
  const newImageUrl = await saveImage(formData.get("image") as File | null);

  const [after] = await db
    .update(products)
    .set({ ...fields, ...(newImageUrl ? { imageUrl: newImageUrl } : {}) })
    .where(eq(products.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: "product.update",
    entity: "products",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export type ImportProductsState = { error: string } | { success: true; count: number } | undefined;

// Bulk product import (requirement #16). Expects the same columns the CSV
// export produces, so export → edit in a spreadsheet → re-import round-trips.
export async function importProductsCsv(
  _state: ImportProductsState,
  formData: FormData
): Promise<ImportProductsState> {
  const user = await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a CSV file first." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "That CSV has no data rows." };

  const header = rows[0].map((h) => h.trim());
  const required = ["sku", "name"];
  for (const col of required) {
    if (!header.includes(col)) return { error: `CSV is missing required column "${col}"` };
  }

  let count = 0;
  for (const row of rows.slice(1)) {
    const record: Record<string, string> = {};
    header.forEach((col, i) => (record[col] = row[i] ?? ""));

    const sku = record.sku?.trim();
    const name = record.name?.trim();
    if (!sku || !name) continue;

    const [existing] = await db.select().from(products).where(eq(products.sku, sku));
    const fields = {
      sku,
      name,
      brand: record.brand?.trim() || null,
      category: record.category?.trim() || null,
      packingUnit: record.packingUnit?.trim() || null,
      company: record.company?.trim() || null,
      unit: record.unit?.trim() || "pcs",
      costPrice: Number(record.costPrice) || 0,
      minSellingPrice: Number(record.minSellingPrice) || 0,
      minStock: Number(record.minStock) || 0,
      maxStock: record.maxStock ? Number(record.maxStock) : null,
      reorderLevel: Number(record.reorderLevel) || 0,
    };

    if (existing) {
      await db.update(products).set(fields).where(eq(products.id, existing.id));
    } else {
      await db.insert(products).values(fields);
    }
    count++;
  }

  await logAudit({
    actorId: user.id,
    action: "product.import_csv",
    entity: "products",
    after: { count },
  });

  revalidatePath("/dashboard/products");
  return { success: true, count };
}

export async function setProductActive(id: number, active: boolean) {
  const user = await requireAdmin();
  const [before] = await db.select().from(products).where(eq(products.id, id));

  const [after] = await db
    .update(products)
    .set({ active })
    .where(eq(products.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: active ? "product.activate" : "product.deactivate",
    entity: "products",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}
