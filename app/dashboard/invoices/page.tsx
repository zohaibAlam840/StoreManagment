import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, customers } from "@/lib/db/schema";

export default async function InvoicesPage() {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      date: invoices.date,
      total: invoices.total,
      status: invoices.status,
      paymentMode: invoices.paymentMode,
      customerName: customers.name,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(invoices.number))
    .limit(200);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Sales Invoices
        </h1>
        <Link
          href="/dashboard/invoices/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          New invoice
        </Link>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">#</th>
            <th className="py-2">Date</th>
            <th className="py-2">Customer</th>
            <th className="py-2">Payment mode</th>
            <th className="py-2">Total</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                <Link href={`/dashboard/invoices/${r.id}`} className="underline">
                  {r.number}
                </Link>
              </td>
              <td className="py-2">{r.date.toLocaleDateString()}</td>
              <td className="py-2">{r.customerName ?? "—"}</td>
              <td className="py-2 capitalize">{r.paymentMode.replace("_", " ")}</td>
              <td className="py-2">{r.total.toFixed(2)}</td>
              <td className="py-2 capitalize">{r.status}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-500">
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
