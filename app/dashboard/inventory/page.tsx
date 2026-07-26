import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/dal";
import { getInventoryReport } from "@/lib/inventory";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { StockAdjustmentForm } from "@/components/StockAdjustmentForm";

const categoryLabel: Record<string, string> = {
  fast: "Fast moving",
  slow: "Slow moving",
  dead: "Dead stock",
  normal: "Normal",
};

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const [report, allProducts] = await Promise.all([
    getInventoryReport(),
    db
      .select({ id: products.id, name: products.name, unit: products.unit })
      .from(products)
      .where(eq(products.active, true)),
  ]);

  const lowStock = report.filter((r) => r.lowStock);
  const deadStock = report.filter((r) => r.category === "dead" && r.stock > 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Inventory
        </h1>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Product</th>
              <th className="py-2">Stock</th>
              <th className="py-2">Min</th>
              <th className="py-2">Max</th>
              <th className="py-2">Reorder level</th>
              <th className="py-2">Sold (30d)</th>
              <th className="py-2">Movement</th>
              <th className="py-2">Suggested reorder qty</th>
            </tr>
          </thead>
          <tbody>
            {report.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">
                  {r.name} <span className="text-zinc-400">({r.sku})</span>
                </td>
                <td className={`py-2 ${r.lowStock ? "font-semibold text-red-600" : r.overStock ? "font-semibold text-amber-600" : ""}`}>
                  {r.stock} {r.unit}
                </td>
                <td className="py-2">{r.minStock}</td>
                <td className="py-2">{r.maxStock ?? "—"}</td>
                <td className="py-2">{r.reorderLevel}</td>
                <td className="py-2">{r.soldLast30Days}</td>
                <td className="py-2">{categoryLabel[r.category]}</td>
                <td className="py-2">{r.suggestedReorderQty > 0 ? r.suggestedReorderQty : "—"}</td>
              </tr>
            ))}
            {report.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-zinc-500">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Low stock ({lowStock.length})
          </h2>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400">
            {lowStock.map((r) => (
              <li key={r.id}>
                {r.name}: {r.stock} {r.unit} (reorder ~{r.suggestedReorderQty})
              </li>
            ))}
            {lowStock.length === 0 && <li className="text-zinc-400">Nothing low right now.</li>}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Dead stock ({deadStock.length})
          </h2>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400">
            {deadStock.map((r) => (
              <li key={r.id}>
                {r.name}: {r.stock} {r.unit} (no sales in 90 days)
              </li>
            ))}
            {deadStock.length === 0 && <li className="text-zinc-400">No dead stock.</li>}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Stock adjustment / damage
        </h2>
        <StockAdjustmentForm products={allProducts} />
      </div>
    </div>
  );
}
