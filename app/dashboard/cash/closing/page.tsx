import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { cashClosings } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCurrentCashBalance } from "@/lib/cash";
import { createCashClosing } from "@/lib/actions/cash";

export default async function CashClosingPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const [expectedCash, pastClosings] = await Promise.all([
    getCurrentCashBalance("cash"),
    db.select().from(cashClosings).orderBy(desc(cashClosings.date)).limit(30),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Cash closing
        </h1>
        <p className="mb-4 text-sm text-zinc-500">
          System-expected cash on hand right now: <strong>{expectedCash.toFixed(2)}</strong>. Count
          the physical cash drawer and enter it below — any difference is recorded, not silently
          adjusted.
        </p>
        <form action={createCashClosing} className="flex max-w-md flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Counted cash</span>
            <input name="countedCash" type="number" step="0.01" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Note</span>
            <input name="note" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            Record closing
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Past closings
        </h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Date</th>
              <th className="py-2">Expected</th>
              <th className="py-2">Counted</th>
              <th className="py-2">Variance</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {pastClosings.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{c.date.toLocaleString()}</td>
                <td className="py-2">{c.expectedCash.toFixed(2)}</td>
                <td className="py-2">{c.countedCash.toFixed(2)}</td>
                <td className={`py-2 ${c.variance !== 0 ? "font-semibold text-red-600" : ""}`}>
                  {c.variance.toFixed(2)}
                </td>
                <td className="py-2">{c.note ?? "—"}</td>
              </tr>
            ))}
            {pastClosings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-zinc-500">
                  No closings recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
