import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { purchases, suppliers } from "@/lib/db/schema";

export default async function PurchasesPage() {
  const rows = await db
    .select({
      id: purchases.id,
      number: purchases.number,
      date: purchases.date,
      total: purchases.total,
      supplierName: suppliers.name,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .orderBy(desc(purchases.number))
    .limit(200);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Purchases</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/purchases/suppliers"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Suppliers
          </Link>
          <Link
            href="/dashboard/purchases/orders"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Purchase Orders
          </Link>
          <Link
            href="/dashboard/purchases/new"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            New purchase
          </Link>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">#</th>
            <th className="py-2">Date</th>
            <th className="py-2">Supplier</th>
            <th className="py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                <Link href={`/dashboard/purchases/${r.id}`} className="underline">
                  {r.number}
                </Link>
              </td>
              <td className="py-2">{r.date.toLocaleDateString()}</td>
              <td className="py-2">{r.supplierName ?? "—"}</td>
              <td className="py-2">{r.total.toFixed(2)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-500">
                No purchases yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
