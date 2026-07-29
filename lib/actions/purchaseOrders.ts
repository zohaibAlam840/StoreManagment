"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { purchaseOrders, purchaseOrderLines } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";

type POLineInput = { productId: number; qty: number; expectedCost: number };

export type CreatePurchaseOrderResult = { id: number } | { error: string };

// Returns a structured error instead of throwing: Next.js redacts thrown
// Server Action error messages in production builds, so validation failures
// must be returned, not thrown, to actually reach the user.
export async function createPurchaseOrder(input: {
  supplierId: number;
  lines: POLineInput[];
}): Promise<CreatePurchaseOrderResult> {
  const user = await getCurrentUser();
  if (user.role !== "admin") return { error: "Only an admin can create purchase orders" };
  if (input.lines.length === 0) return { error: "Add at least one product" };

  const [{ maxNumber } = { maxNumber: 0 }] = await db
    .select({ maxNumber: sql<number>`coalesce(max(${purchaseOrders.number}), 0)` })
    .from(purchaseOrders);
  const nextNumber = (maxNumber ?? 0) + 1;

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      number: nextNumber,
      supplierId: input.supplierId,
      status: "pending",
      createdBy: user.id,
    })
    .returning();

  for (const line of input.lines) {
    await db.insert(purchaseOrderLines).values({
      purchaseOrderId: po.id,
      productId: line.productId,
      qty: line.qty,
      expectedCost: line.expectedCost,
    });
  }

  await logAudit({
    actorId: user.id,
    action: "purchase_order.create",
    entity: "purchase_orders",
    entityId: po.id,
    after: po,
  });

  return { id: po.id };
}

export async function cancelPurchaseOrder(id: number) {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new Error("Only an admin can cancel purchase orders");

  const [before] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  const [after] = await db
    .update(purchaseOrders)
    .set({ status: "cancelled" })
    .where(eq(purchaseOrders.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: "purchase_order.cancel",
    entity: "purchase_orders",
    entityId: id,
    before,
    after,
  });

  redirect("/dashboard/purchases/orders");
}
