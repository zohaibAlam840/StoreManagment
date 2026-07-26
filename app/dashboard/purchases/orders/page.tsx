import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { purchaseOrders, suppliers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { cancelPurchaseOrder } from "@/lib/actions/purchaseOrders";

export default async function PurchaseOrdersPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const rows = await db
    .select({
      id: purchaseOrders.id,
      number: purchaseOrders.number,
      date: purchaseOrders.date,
      status: purchaseOrders.status,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .orderBy(desc(purchaseOrders.number));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Purchase Orders
        </h1>
        <Link
          href="/dashboard/purchases/orders/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          New purchase order
        </Link>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">#</th>
            <th className="py-2">Date</th>
            <th className="py-2">Supplier</th>
            <th className="py-2">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{r.number}</td>
              <td className="py-2">{r.date.toLocaleDateString()}</td>
              <td className="py-2">{r.supplierName ?? "—"}</td>
              <td className="py-2 capitalize">{r.status}</td>
              <td className="py-2 flex gap-2">
                {r.status === "pending" && (
                  <>
                    <Link
                      href={`/dashboard/purchases/new?poId=${r.id}&supplierId=${r.supplierId}`}
                      className="text-zinc-600 underline dark:text-zinc-400"
                    >
                      Receive
                    </Link>
                    <form action={cancelPurchaseOrder.bind(null, r.id)}>
                      <button type="submit" className="text-red-600 underline">
                        Cancel
                      </button>
                    </form>
                  </>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-zinc-500">
                No purchase orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
