import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Receipt, AlertTriangle, CheckSquare, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSalesByPeriod, getReceivables } from "@/lib/reports";
import { getInventoryReport } from "@/lib/inventory";
import { listPendingApprovals } from "@/lib/approvals";
import { db } from "@/lib/db/client";
import { invoices, customers } from "@/lib/db/schema";
import { startOfDay, endOfDay } from "@/lib/cash";
import { StatCard } from "@/components/StatCard";

export default async function DashboardHome() {
  const user = await getCurrentUser();

  // Salesman dashboard is intentionally just the one action they need most —
  // no sales/stock/receivables summaries, which are admin-only concerns.
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <Link
          href="/dashboard/invoices/new"
          className="w-full max-w-xs rounded-md bg-accent px-6 py-4 text-lg font-medium text-white dark:bg-accent dark:text-white"
        >
          + New Sale Invoice
        </Link>
      </div>
    );
  }

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
          <Link href="/dashboard/invoices/new" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white dark:bg-accent dark:text-white">
            + New Sale Invoice
          </Link>
          <Link href="/dashboard/purchases/new" className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
            + New Purchase
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Today's sales" value={todayTotal.toFixed(2)} icon={Receipt} tone="accent" />
        <StatCard
          label="Low stock items"
          value={lowStockCount}
          icon={AlertTriangle}
          tone={lowStockCount > 0 ? "danger" : "neutral"}
          href="/dashboard/inventory"
        />
        <StatCard
          label="Pending approvals"
          value={pendingApprovals.length}
          icon={CheckSquare}
          tone={pendingApprovals.length > 0 ? "warning" : "neutral"}
          href="/dashboard/approvals"
        />
        <StatCard
          label="Total receivable"
          value={totalReceivable.toFixed(2)}
          icon={Wallet}
          tone="neutral"
          href="/dashboard/reports/receivables"
        />
      </div>

      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Recent invoices
        </h2>
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
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
                  <Link href={`/dashboard/invoices/${r.id}`} className="text-accent underline">
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
