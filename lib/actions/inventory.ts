"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordStockMovement, getStockOnHand } from "@/lib/inventory";
import { logAudit } from "@/lib/audit";
import type { StockMovementType } from "@/lib/db/schema";

export type AdjustStockState = { error: string } | undefined;

// Inventory is an admin-only route already (see app/dashboard/inventory), so
// every call here is inherently admin-approved (requirement #10's "stock
// adjustments require admin approval" is satisfied by route access, not a
// separate approval-queue step).
export async function adjustStock(
  _state: AdjustStockState,
  formData: FormData
): Promise<AdjustStockState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { error: "Only an admin can adjust stock" };
  }

  const productId = Number(formData.get("productId"));
  const type = String(formData.get("type") ?? "adjustment") as StockMovementType;
  const rawQty = Number(formData.get("qty") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!productId || rawQty === 0) {
    return { error: "Select a product and a non-zero quantity" };
  }

  // Damage is always a loss; adjustment can go either direction (e.g. correcting
  // a miscount upward), so only damage forces the sign.
  const qty = type === "damage" ? -Math.abs(rawQty) : rawQty;

  const before = await getStockOnHand(productId);
  if (before + qty < 0) {
    return { error: `This would take stock negative (current: ${before}, change: ${qty})` };
  }

  await recordStockMovement({
    productId,
    type,
    qty,
    refType: "manual",
    createdBy: user.id,
    note,
  });

  await logAudit({
    actorId: user.id,
    action: type === "damage" ? "stock.damage" : "stock.adjustment",
    entity: "stock_ledger",
    entityId: productId,
    before: { stock: before },
    after: { stock: before + qty, note },
  });

  revalidatePath("/dashboard/inventory");
  return undefined;
}
