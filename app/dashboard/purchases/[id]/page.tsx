import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { purchases, purchaseLines, suppliers, products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { CorrectPurchaseCostForm } from "@/components/CorrectPurchaseCostForm";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  const purchaseId = Number(id);

  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
  if (!purchase) notFound();

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, purchase.supplierId));

  const lines = await db
    .select({
      id: purchaseLines.id,
      qty: purchaseLines.qty,
      cost: purchaseLines.cost,
      productName: products.name,
      unit: products.unit,
    })
    .from(purchaseLines)
    .leftJoin(products, eq(purchaseLines.productId, products.id))
    .where(eq(purchaseLines.purchaseId, purchaseId));

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Purchase #{purchase.number}
      </h1>
      <p className="mb-1 text-sm">Supplier: {supplier?.name ?? "—"}</p>
      <p className="mb-4 text-sm">Date: {purchase.date.toLocaleString()}</p>

      {user.role === "admin" && (
        <p className="mb-4 text-xs text-zinc-500">
          Received stock before the supplier's final rate was confirmed? Record it here with your
          best estimate, then use <strong>Correct</strong> on a line once the real invoice arrives —
          it updates this purchase&apos;s totals and the product&apos;s standard cost together.
        </p>
      )}

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Product</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Cost</th>
            <th className="py-2">Amount</th>
            {user.role === "admin" && <th className="py-2"></th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{l.productName}</td>
              <td className="py-2">
                {l.qty} {l.unit}
              </td>
              <td className="py-2">{l.cost.toFixed(2)}</td>
              <td className="py-2">{(l.qty * l.cost).toFixed(2)}</td>
              {user.role === "admin" && (
                <td className="py-2">
                  <CorrectPurchaseCostForm lineId={l.id} currentCost={l.cost} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <p>Subtotal: {purchase.subtotal.toFixed(2)}</p>
        <p>Freight: {purchase.freight.toFixed(2)}</p>
        <p>Loading/Unloading: {purchase.loadingUnloading.toFixed(2)}</p>
        <p>Other expenses: {purchase.otherExpenses.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Total: {purchase.total.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
