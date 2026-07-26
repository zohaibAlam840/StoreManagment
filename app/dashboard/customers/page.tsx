import Link from "next/link";
import { db } from "@/lib/db/client";
import { customers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCustomerCurrentBalance } from "@/lib/customers";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const isAdmin = user.role === "admin";

  const allCustomers = await db.select().from(customers).orderBy(customers.name);
  const balances = await Promise.all(allCustomers.map((c) => getCustomerCurrentBalance(c.id)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Customers
        </h1>
        <div className="flex gap-2">
          {isAdmin && (
            <a
              href="/api/customers/export"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              Export CSV
            </a>
          )}
          {isAdmin && (
            <Link
              href="/dashboard/customers/new"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Add customer
            </Link>
          )}
        </div>
      </div>

      {!isAdmin && (
        <p className="mb-4 text-sm text-zinc-500">
          Showing customer ledger balances only. Editing customer details and
          rates requires an admin.
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Phone</th>
            {isAdmin && <th className="py-2">Credit limit</th>}
            <th className="py-2">Balance</th>
            {isAdmin && <th className="py-2"></th>}
          </tr>
        </thead>
        <tbody>
          {allCustomers.map((c, i) => (
            <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{c.name}</td>
              <td className="py-2">{c.phone ?? "—"}</td>
              {isAdmin && <td className="py-2">{c.creditLimit?.toFixed(2) ?? "—"}</td>}
              <td className="py-2">{balances[i].toFixed(2)}</td>
              {isAdmin && (
                <td className="py-2">
                  <Link
                    href={`/dashboard/customers/${c.id}/edit`}
                    className="text-zinc-600 underline dark:text-zinc-400"
                  >
                    Edit
                  </Link>
                </td>
              )}
            </tr>
          ))}
          {allCustomers.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 5 : 3} className="py-4 text-zinc-500">
                No customers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
