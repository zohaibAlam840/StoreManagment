import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getNetProfit, getReceivables } from "@/lib/reports";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [netProfit, receivables] = await Promise.all([
    getNetProfit(monthStart, monthEnd),
    getReceivables(),
  ]);

  const totalReceivable = receivables.reduce((s, r) => s + r.balance, 0);
  const overLimitCount = receivables.filter((r) => r.overLimit).length;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Net profit (this month)</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {netProfit.netProfit.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Total receivable</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {totalReceivable.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Customers over credit limit</p>
          <p className={`text-xl font-semibold ${overLimitCount > 0 ? "text-red-600" : "text-zinc-900 dark:text-zinc-50"}`}>
            {overLimitCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/reports/sales" className="rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Sales</h2>
          <p className="text-sm text-zinc-500">Daily / weekly / monthly, product-wise, customer-wise</p>
        </Link>
        <Link href="/dashboard/reports/inventory" className="rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Inventory</h2>
          <p className="text-sm text-zinc-500">Stock valuation, stock ledger (dead/slow/fast in Inventory)</p>
        </Link>
        <Link href="/dashboard/reports/profit" className="rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Profit</h2>
          <p className="text-sm text-zinc-500">Product / invoice / customer GP, and Net Profit</p>
        </Link>
        <Link href="/dashboard/reports/receivables" className="rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Receivables</h2>
          <p className="text-sm text-zinc-500">Outstanding balances and customer ledgers</p>
        </Link>
      </div>
    </div>
  );
}
