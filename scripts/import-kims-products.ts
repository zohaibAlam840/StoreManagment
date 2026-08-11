import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFileSync } from "fs";
import { alHamd, alRehman } from "./kims-import-data.mjs";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

type Row = [string, string, string, number, number | null];

function buildRows(list: Row[]) {
  const seen = new Map<string, number>();
  return list.map(([category, name, packingUnit, price, scheme]) => {
    let sku = slugify(name);
    const count = seen.get(sku) ?? 0;
    seen.set(sku, count + 1);
    if (count > 0) sku = `${sku}-${count + 1}`;
    return { sku, name, category, packingUnit, costPrice: price, scheme };
  });
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const rows = [...buildRows(alHamd as Row[]), ...buildRows(alRehman as Row[])];

  // De-dupe products that are identical (same name+price) across both
  // circulars — those are genuinely the same item both shops can stock,
  // not two separate products.
  const bySku = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!bySku.has(r.sku)) bySku.set(r.sku, r);
  }
  const unique = [...bySku.values()];

  const columns = ["sku", "name", "brand", "category", "packingUnit", "company", "unit", "costPrice", "minSellingPrice", "minStock", "maxStock", "reorderLevel"];
  const csvLines = [
    columns.join(","),
    ...unique.map((r) =>
      [r.sku, r.name, "", r.category, r.packingUnit, "Kims", "CTN", r.costPrice, r.costPrice, 0, "", 0]
        .map(csvEscape)
        .join(",")
    ),
  ];
  writeFileSync("scripts/kims-products-import.csv", csvLines.join("\n"), "utf8");
  console.log(`Wrote scripts/kims-products-import.csv with ${unique.length} products`);

  let inserted = 0;
  let updated = 0;
  for (const r of unique) {
    const [existing] = await db.select().from(products).where(eq(products.sku, r.sku));
    const fields = {
      sku: r.sku,
      name: r.name,
      brand: null,
      category: r.category,
      packingUnit: r.packingUnit,
      company: "Kims",
      unit: "CTN",
      costPrice: r.costPrice,
      minSellingPrice: r.costPrice,
      minStock: 0,
      maxStock: null,
      reorderLevel: 0,
    };
    if (existing) {
      await db.update(products).set(fields).where(eq(products.id, existing.id));
      updated++;
    } else {
      await db.insert(products).values(fields);
      inserted++;
    }
  }
  console.log(`Inserted ${inserted}, updated ${updated} products in the database.`);
  process.exit(0);
}

main();
