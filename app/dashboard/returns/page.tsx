import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { salesReturns, customers, invoices, users } from "@/lib/db/schema";

export default async function SalesReturnsPage() {
  const rows = await db
    .select({
      id: salesReturns.id,
      number: salesReturns.number,
      date: salesReturns.date,
      total: salesReturns.total,
      reason: salesReturns.reason,
      customerName: customers.name,
      invoiceId: invoices.id,
      invoiceNumber: invoices.number,
      createdByName: users.name,
    })
    .from(salesReturns)
    .leftJoin(customers, eq(salesReturns.customerId, customers.id))
    .leftJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
    .leftJoin(users, eq(salesReturns.createdBy, users.id))
    .orderBy(desc(salesReturns.number))
    .limit(200);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Sales Returns
        </h1>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Return #</th>
              <th className="py-2">Date</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Against invoice</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Total</th>
              <th className="py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">
                  <Link href={`/dashboard/returns/${r.id}`} className="underline">
                    {r.number}
                  </Link>
                </td>
                <td className="py-2">{r.date.toLocaleDateString()}</td>
                <td className="py-2">{r.customerName ?? "—"}</td>
                <td className="py-2">
                  {r.invoiceId ? (
                    <Link href={`/dashboard/invoices/${r.invoiceId}`} className="underline">
                      #{r.invoiceNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2">{r.reason ?? "—"}</td>
                <td className="py-2">{r.total.toFixed(2)}</td>
                <td className="py-2">{r.createdByName ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-zinc-500">
                  No returns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
