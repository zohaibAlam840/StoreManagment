"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { purchases, purchaseLines, products, purchaseOrders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordStockMovement } from "@/lib/inventory";
import { logAudit } from "@/lib/audit";

type PurchaseLineInput = { productId: number; qty: number; cost: number };

export async function createPurchase(input: {
  supplierId: number;
  purchaseOrderId?: number | null;
  freight: number;
  loadingUnloading: number;
  otherExpenses: number;
  lines: PurchaseLineInput[];
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new Error("Only an admin can record purchases");

  if (input.lines.length === 0) {
    throw new Error("Add at least one product to the purchase");
  }

  const productIds = input.lines.map((l) => l.productId);
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const subtotal = input.lines.reduce((sum, l) => sum + l.qty * l.cost, 0);
  const total = subtotal + input.freight + input.loadingUnloading + input.otherExpenses;

  const [{ maxNumber } = { maxNumber: 0 }] = await db
    .select({ maxNumber: sql<number>`coalesce(max(${purchases.number}), 0)` })
    .from(purchases);
  const nextNumber = (maxNumber ?? 0) + 1;

  const [purchase] = await db
    .insert(purchases)
    .values({
      number: nextNumber,
      supplierId: input.supplierId,
      purchaseOrderId: input.purchaseOrderId ?? null,
      subtotal,
      freight: input.freight,
      loadingUnloading: input.loadingUnloading,
      otherExpenses: input.otherExpenses,
      total,
      createdBy: user.id,
    })
    .returning();

  for (const line of input.lines) {
    await db.insert(purchaseLines).values({
      purchaseId: purchase.id,
      productId: line.productId,
      qty: line.qty,
      cost: line.cost,
    });

    await recordStockMovement({
      productId: line.productId,
      type: "purchase",
      qty: line.qty,
      refType: "purchase",
      refId: purchase.id,
      createdBy: user.id,
    });

    // Administrator-maintained purchase cost: the latest purchase cost becomes
    // the product's standard cost for future GP calc and min-margin checks.
    const product = productById.get(line.productId);
    if (product && product.costPrice !== line.cost) {
      await db.update(products).set({ costPrice: line.cost }).where(eq(products.id, line.productId));
    }
  }

  if (input.purchaseOrderId) {
    await db
      .update(purchaseOrders)
      .set({ status: "received" })
      .where(eq(purchaseOrders.id, input.purchaseOrderId));
  }

  await logAudit({
    actorId: user.id,
    action: "purchase.create",
    entity: "purchases",
    entityId: purchase.id,
    after: purchase,
  });

  return { id: purchase.id };
}
