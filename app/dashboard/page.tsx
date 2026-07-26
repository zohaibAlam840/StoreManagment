import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSalesByPeriod, getReceivables } from "@/lib/reports";
import { getInventoryReport } from "@/lib/inventory";
import { listPendingApprovals } from "@/lib/approvals";
import { db } from "@/lib/db/client";
import { invoices, customers } from "@/lib/db/schema";
import { startOfDay, endOfDay } from "@/lib/cash";

export default async function DashboardHome() {
  const user = await getCurrentUser();

  const recentInvoices = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      total: invoices.total,
      date: invoices.date,
      customerName: customers.name,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(invoices.number))
    .limit(5);

  if (user.role !== "admin") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <Link
          href="/dashboard/invoices/new"
          className="w-fit rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + New Sale Invoice
        </Link>

        <div>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Recent invoices
          </h2>
          <div className="overflow-x-auto">
          <table className="w-full max-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">#</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">
                    <Link href={`/dashboard/invoices/${r.id}`} className="underline">
                      {r.number}
                    </Link>
                  </td>
                  <td className="py-2">{r.customerName ?? "—"}</td>
                  <td className="py-2">{r.total.toFixed(2)}</td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-zinc-500">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const [todaySales, inventoryReport, pendingApprovals, receivables] = await Promise.all([
    getSalesByPeriod(startOfDay(now), endOfDay(now), "day"),
    getInventoryReport(),
    listPendingApprovals(),
    getReceivables(),
  ]);

  const todayTotal = todaySales.reduce((s, r) => s + r.total, 0);
  const lowStockCount = inventoryReport.filter((r) => r.lowStock).length;
  const totalReceivable = receivables.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/invoices/new" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            + New Sale Invoice
          </Link>
          <Link href="/dashboard/purchases/new" className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
            + New Purchase
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Today&apos;s sales</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{todayTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Low stock items</p>
          <Link href="/dashboard/inventory" className={`text-xl font-semibold ${lowStockCount > 0 ? "text-red-600" : "text-zinc-900 dark:text-zinc-50"}`}>
            {lowStockCount}
          </Link>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Pending approvals</p>
          <Link href="/dashboard/approvals" className={`text-xl font-semibold ${pendingApprovals.length > 0 ? "text-amber-600" : "text-zinc-900 dark:text-zinc-50"}`}>
            {pendingApprovals.length}
          </Link>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Total receivable</p>
          <Link href="/dashboard/reports/receivables" className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {totalReceivable.toFixed(2)}
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Recent invoices
        </h2>
        <div className="overflow-x-auto">
        <table className="w-full max-w-xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">#</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentInvoices.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">
                  <Link href={`/dashboard/invoices/${r.id}`} className="underline">
                    {r.number}
                  </Link>
                </td>
                <td className="py-2">{r.customerName ?? "—"}</td>
                <td className="py-2">{r.total.toFixed(2)}</td>
              </tr>
            ))}
            {recentInvoices.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-zinc-500">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
