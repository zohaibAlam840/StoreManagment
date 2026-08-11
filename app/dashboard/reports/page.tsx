import Link from "next/link";
import { redirect } from "next/navigation";
import { and, gte, lt, ne, sql } from "drizzle-orm";
import { TrendingUp, Wallet, AlertTriangle, Receipt, BarChart3, Boxes, PiggyBank, Users } from "lucide-react";
import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getNetProfit, getReceivables } from "@/lib/reports";
import { StatCard } from "@/components/StatCard";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [netProfit, receivables, [invoiceSummary]] = await Promise.all([
    getNetProfit(monthStart, monthEnd),
    getReceivables(),
    db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(and(ne(invoices.status, "draft"), gte(invoices.date, monthStart), lt(invoices.date, monthEnd))),
  ]);

  const totalReceivable = receivables.reduce((s, r) => s + r.balance, 0);
  const overLimitCount = receivables.filter((r) => r.overLimit).length;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Invoices (this month)"
          value={`${invoiceSummary.count} · ${invoiceSummary.total.toFixed(2)}`}
          icon={Receipt}
          tone="neutral"
          href="/dashboard/invoices"
        />
        <StatCard label="Net profit (this month)" value={netProfit.netProfit.toFixed(2)} icon={TrendingUp} tone="accent" />
        <StatCard label="Total receivable" value={totalReceivable.toFixed(2)} icon={Wallet} tone="neutral" />
        <StatCard
          label="Customers over credit limit"
          value={overLimitCount}
          icon={AlertTriangle}
          tone={overLimitCount > 0 ? "danger" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/invoices"
          className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <Receipt size={18} />
          </span>
          <span>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Invoices</h2>
            <p className="text-sm text-zinc-500">Full invoice history, status, and drafts</p>
          </span>
        </Link>
        <Link
          href="/dashboard/reports/sales"
          className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <BarChart3 size={18} />
          </span>
          <span>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Sales</h2>
            <p className="text-sm text-zinc-500">Daily / weekly / monthly, product-wise, customer-wise</p>
          </span>
        </Link>
        <Link
          href="/dashboard/reports/inventory"
          className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <Boxes size={18} />
          </span>
          <span>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Inventory</h2>
            <p className="text-sm text-zinc-500">Stock valuation, stock ledger (dead/slow/fast in Inventory)</p>
          </span>
        </Link>
        <Link
          href="/dashboard/reports/profit"
          className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <PiggyBank size={18} />
          </span>
          <span>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Profit</h2>
            <p className="text-sm text-zinc-500">Product / invoice / customer GP, and Net Profit</p>
          </span>
        </Link>
        <Link
          href="/dashboard/reports/receivables"
          className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <Users size={18} />
          </span>
          <span>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Receivables</h2>
            <p className="text-sm text-zinc-500">Outstanding balances and customer ledgers</p>
          </span>
        </Link>
      </div>
    </div>
  );
}
