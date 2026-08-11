import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { stockLedger, products, invoices, invoiceLines, type StockMovementType } from "@/lib/db/schema";

// Stock-on-hand is always derived from the ledger (SUM(qty)), never a mutable
// counter, so it can never drift from the sale/purchase/adjustment history.
export async function getStockOnHand(productId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${stockLedger.qty}), 0)` })
    .from(stockLedger)
    .where(eq(stockLedger.productId, productId));
  return row?.total ?? 0;
}

export async function getStockOnHandMany(productIds: number[]): Promise<Map<number, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({
      productId: stockLedger.productId,
      total: sql<number>`coalesce(sum(${stockLedger.qty}), 0)`,
    })
    .from(stockLedger)
    .where(inArray(stockLedger.productId, productIds))
    .groupBy(stockLedger.productId);
  return new Map(rows.map((r) => [r.productId, r.total]));
}

// Unfiltered variant so callers who also need the full active-product list
// (e.g. the invoice/purchase entry screens) can fetch both in parallel
// instead of waiting for the product query to resolve just to get the id
// list this would otherwise need — each awaited round trip to a remote DB
// adds real latency, so cutting a sequential dependency here is a genuine
// perceived-speed win, not just a style preference.
export async function getAllStockOnHand(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      productId: stockLedger.productId,
      total: sql<number>`coalesce(sum(${stockLedger.qty}), 0)`,
    })
    .from(stockLedger)
    .groupBy(stockLedger.productId);
  return new Map(rows.map((r) => [r.productId, r.total]));
}

export async function recordStockMovement(input: {
  productId: number;
  type: StockMovementType;
  qty: number;
  refType: string;
  refId?: number | null;
  note?: string | null;
  createdBy?: number | null;
}) {
  await db.insert(stockLedger).values({
    productId: input.productId,
    type: input.type,
    qty: input.qty,
    refType: input.refType,
    refId: input.refId ?? null,
    note: input.note ?? null,
    createdBy: input.createdBy ?? null,
  });
}

export type MovementCategory = "fast" | "slow" | "dead" | "normal";

export type InventoryReportRow = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number | null;
  reorderLevel: number;
  soldLast30Days: number;
  soldLast90Days: number;
  suggestedReorderQty: number;
  category: MovementCategory;
  lowStock: boolean;
  overStock: boolean;
};

// Reorder suggestion and fast/slow/dead classification are both derived from
// trailing sales velocity, so a product's status always reflects how it's
// actually been moving rather than a manually-maintained flag.
export async function getInventoryReport(): Promise<InventoryReportRow[]> {
  const allProducts = await db.select().from(products).where(eq(products.active, true));
  const stockMap = await getStockOnHandMany(allProducts.map((p) => p.id));

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const salesRows30 = await db
    .select({
      productId: invoiceLines.productId,
      total: sql<number>`coalesce(sum(${invoiceLines.qty}), 0)`,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, since30)))
    .groupBy(invoiceLines.productId);
  const sold30Map = new Map(salesRows30.map((r) => [r.productId, r.total]));

  const salesRows90 = await db
    .select({
      productId: invoiceLines.productId,
      total: sql<number>`coalesce(sum(${invoiceLines.qty}), 0)`,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
    .where(and(eq(invoices.status, "posted"), gte(invoices.date, since90)))
    .groupBy(invoiceLines.productId);
  const sold90Map = new Map(salesRows90.map((r) => [r.productId, r.total]));

  const LEAD_TIME_DAYS = 14;

  return allProducts.map((p) => {
    const stock = stockMap.get(p.id) ?? 0;
    const soldLast30Days = sold30Map.get(p.id) ?? 0;
    const soldLast90Days = sold90Map.get(p.id) ?? 0;
    const avgDaily = soldLast30Days / 30;

    let category: MovementCategory = "normal";
    if (soldLast90Days === 0) category = "dead";
    else if (soldLast30Days >= 30) category = "fast";
    else if (soldLast30Days > 0) category = "slow";

    const lowStock = stock <= p.reorderLevel;
    const overStock = p.maxStock != null && stock > p.maxStock;
    const suggestedReorderQty = lowStock
      ? Math.max(0, Math.ceil(avgDaily * LEAD_TIME_DAYS) - stock)
      : 0;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      stock,
      minStock: p.minStock,
      maxStock: p.maxStock,
      reorderLevel: p.reorderLevel,
      soldLast30Days,
      soldLast90Days,
      suggestedReorderQty,
      category,
      lowStock,
      overStock,
    };
  });
}
