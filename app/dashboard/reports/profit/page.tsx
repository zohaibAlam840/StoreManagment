import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getProfitByProduct, getProfitByInvoice, getProfitByCustomer, getNetProfit } from "@/lib/reports";

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { from: fromParam, to: toParam } = await searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(new Date(toParam).getTime() + 24 * 60 * 60 * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [byProduct, byInvoice, byCustomer, netProfit] = await Promise.all([
    getProfitByProduct(from, to),
    getProfitByInvoice(from, to),
    getProfitByCustomer(from, to),
    getNetProfit(from, to),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Profit Report</h1>

      <form className="flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">From</span>
          <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">To</span>
          <input type="date" name="to" defaultValue={new Date(to.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-white dark:bg-accent dark:text-white">
          Filter
        </button>
      </form>

      <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm">Gross profit: {netProfit.grossProfit.toFixed(2)}</p>
        <p className="text-sm">Purchase expenses (freight/loading/other): {netProfit.purchaseExpenses.toFixed(2)}</p>
        <p className="text-sm">Other cash expenses: {netProfit.otherExpenses.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Net profit: {netProfit.netProfit.toFixed(2)}
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Product-wise GP</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Product</th>
              <th className="py-2">Revenue</th>
              <th className="py-2">Cost</th>
              <th className="py-2">GP</th>
            </tr>
          </thead>
          <tbody>
            {byProduct.map((r) => (
              <tr key={r.productName} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{r.productName}</td>
                <td className="py-2">{r.revenue.toFixed(2)}</td>
                <td className="py-2">{r.cost.toFixed(2)}</td>
                <td className="py-2">{r.gp.toFixed(2)}</td>
              </tr>
            ))}
            {byProduct.length === 0 && <tr><td colSpan={4} className="py-4 text-zinc-500">No sales.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Invoice-wise GP</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Invoice #</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Revenue</th>
              <th className="py-2">GP</th>
            </tr>
          </thead>
          <tbody>
            {byInvoice.map((r) => (
              <tr key={r.number} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{r.number}</td>
                <td className="py-2">{r.customerName}</td>
                <td className="py-2">{r.revenue.toFixed(2)}</td>
                <td className="py-2">{r.gp.toFixed(2)}</td>
              </tr>
            ))}
            {byInvoice.length === 0 && <tr><td colSpan={4} className="py-4 text-zinc-500">No sales.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Customer-wise GP</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Customer</th>
              <th className="py-2">Revenue</th>
              <th className="py-2">Cost</th>
              <th className="py-2">GP</th>
            </tr>
          </thead>
          <tbody>
            {byCustomer.map((r) => (
              <tr key={r.customerName} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{r.customerName}</td>
                <td className="py-2">{r.revenue.toFixed(2)}</td>
                <td className="py-2">{r.cost.toFixed(2)}</td>
                <td className="py-2">{r.gp.toFixed(2)}</td>
              </tr>
            ))}
            {byCustomer.length === 0 && <tr><td colSpan={4} className="py-4 text-zinc-500">No sales.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
