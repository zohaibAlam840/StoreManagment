import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, customers } from "@/lib/db/schema";
import { listDrafts } from "@/lib/actions/invoices";
import { DeleteDraftButton } from "@/components/DeleteDraftButton";

export default async function InvoicesPage() {
  const [rows, drafts] = await Promise.all([
    db
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
      .where(ne(invoices.status, "draft"))
      .orderBy(desc(invoices.number))
      .limit(200),
    listDrafts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
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

      {drafts.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Your drafts
          </h2>
          <p className="mb-2 text-sm text-zinc-500">
            Saved but not finalized — useful if you get interrupted mid-sale or need to switch
            between two customers at the counter.
          </p>
          <div className="overflow-x-auto">
          <table className="w-full max-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">Customer</th>
                <th className="py-2">Total so far</th>
                <th className="py-2">Saved</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{d.customerName ?? "—"}</td>
                  <td className="py-2">{d.total.toFixed(2)}</td>
                  <td className="py-2">{d.createdAt.toLocaleString()}</td>
                  <td className="py-2 flex gap-3">
                    <Link href={`/dashboard/invoices/new?draft=${d.id}`} className="text-zinc-600 underline dark:text-zinc-400">
                      Resume
                    </Link>
                    <DeleteDraftButton draftId={d.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
