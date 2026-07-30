import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSupplierCurrentBalance } from "@/lib/suppliers";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const allSuppliers = await db.select().from(suppliers).orderBy(suppliers.name);
  const balances = await Promise.all(allSuppliers.map((s) => getSupplierCurrentBalance(s.id)));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Suppliers</h1>
        <Link
          href="/dashboard/purchases/suppliers/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Add supplier
        </Link>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Phone</th>
            <th className="py-2">Balance</th>
            <th className="py-2">Active</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {allSuppliers.map((s, i) => (
            <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{s.name}</td>
              <td className="py-2">{s.phone ?? "—"}</td>
              <td className="py-2">{balances[i].toFixed(2)}</td>
              <td className="py-2">{s.active ? "Yes" : "No"}</td>
              <td className="py-2 flex gap-3">
                <Link
                  href={`/dashboard/purchases/suppliers/${s.id}/ledger`}
                  className="text-zinc-600 underline dark:text-zinc-400"
                >
                  Ledger
                </Link>
                <Link
                  href={`/dashboard/purchases/suppliers/${s.id}/edit`}
                  className="text-zinc-600 underline dark:text-zinc-400"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
          {allSuppliers.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-zinc-500">
                No suppliers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
