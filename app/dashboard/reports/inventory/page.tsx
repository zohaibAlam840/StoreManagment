import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStockValuation } from "@/lib/reports";

export default async function InventoryReportPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { rows, totalValue } = await getStockValuation();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Stock Valuation
        </h1>
        <Link href="/dashboard/inventory" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          Low stock / dead / slow / fast movers →
        </Link>
      </div>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Product</th>
            <th className="py-2">Stock</th>
            <th className="py-2">Cost price</th>
            <th className="py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.productName} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{r.productName}</td>
              <td className="py-2">{r.stock}</td>
              <td className="py-2">{r.costPrice.toFixed(2)}</td>
              <td className="py-2">{r.value.toFixed(2)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-zinc-500">No products yet.</td></tr>
          )}
        </tbody>
      </table>

      <p className="mt-4 max-w-2xl text-right text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Total stock value: {totalValue.toFixed(2)}
      </p>
    </div>
  );
}
