import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = [
  "sku",
  "name",
  "brand",
  "category",
  "packingUnit",
  "company",
  "unit",
  "costPrice",
  "minSellingPrice",
  "minStock",
  "maxStock",
  "reorderLevel",
] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can export products" }, { status: 403 });
  }

  const rows = await db.select().from(products);
  const lines = [
    COLUMNS.join(","),
    ...rows.map((p) => COLUMNS.map((c) => csvEscape(p[c as keyof typeof p])).join(",")),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
