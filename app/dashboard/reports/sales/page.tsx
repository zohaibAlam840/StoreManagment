import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSalesByPeriod, getSalesByProduct, getSalesByCustomer } from "@/lib/reports";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; groupBy?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { from: fromParam, to: toParam, groupBy: groupByParam } = await searchParams;
  const groupBy = groupByParam === "week" || groupByParam === "month" ? groupByParam : "day";

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(new Date(toParam).getTime() + 24 * 60 * 60 * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [byPeriod, byProduct, byCustomer] = await Promise.all([
    getSalesByPeriod(from, to, groupBy),
    getSalesByProduct(from, to),
    getSalesByCustomer(from, to),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sales Report</h1>

      <form className="flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">From</span>
          <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">To</span>
          <input type="date" name="to" defaultValue={new Date(to.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">Group by</span>
          <select name="groupBy" defaultValue={groupBy} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-white dark:bg-accent dark:text-white">
          Filter
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Sales by {groupBy}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full max-w-md text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Period</th>
              <th className="py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {byPeriod.map((r) => (
              <tr key={r.label} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{r.label}</td>
                <td className="py-2">{r.total.toFixed(2)}</td>
              </tr>
            ))}
            {byPeriod.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-zinc-500">No sales in this range.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">By product</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">Product</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.map((r) => (
                <tr key={r.productName} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{r.productName}</td>
                  <td className="py-2">{r.qty}</td>
                  <td className="py-2">{r.total.toFixed(2)}</td>
                </tr>
              ))}
              {byProduct.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-zinc-500">No sales.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">By customer</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">Customer</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {byCustomer.map((r) => (
                <tr key={r.customerName} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{r.customerName}</td>
                  <td className="py-2">{r.total.toFixed(2)}</td>
                </tr>
              ))}
              {byCustomer.length === 0 && (
                <tr><td colSpan={2} className="py-4 text-zinc-500">No sales.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
