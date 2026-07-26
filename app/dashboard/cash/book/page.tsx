import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCashBook } from "@/lib/cash";
import type { CashMode } from "@/lib/db/schema";

export default async function CashBookPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { mode: modeParam, from: fromParam, to: toParam } = await searchParams;
  const mode: CashMode = modeParam === "bank_transfer" ? "bank_transfer" : "cash";

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(new Date(toParam).getTime() + 24 * 60 * 60 * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const book = await getCashBook(mode, from, to);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {mode === "cash" ? "Cash Book" : "Bank Book"}
      </h1>

      <form className="mb-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">Mode</span>
          <select name="mode" defaultValue={mode} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">From</span>
          <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-700 dark:text-zinc-300">To</span>
          <input
            type="date"
            name="to"
            defaultValue={new Date(to.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
            className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-50 dark:text-zinc-900">
          Filter
        </button>
      </form>

      <p className="mb-2 text-sm text-zinc-500">Opening balance: {book.openingBalance.toFixed(2)}</p>

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Date</th>
            <th className="py-2">Description</th>
            <th className="py-2">In</th>
            <th className="py-2">Out</th>
            <th className="py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {book.entries.map((e, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{e.date.toLocaleString()}</td>
              <td className="py-2">{e.description}</td>
              <td className="py-2">{e.direction === "in" ? e.amount.toFixed(2) : ""}</td>
              <td className="py-2">{e.direction === "out" ? e.amount.toFixed(2) : ""}</td>
              <td className="py-2">{e.runningBalance.toFixed(2)}</td>
            </tr>
          ))}
          {book.entries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-zinc-500">
                No entries in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <p>Total in: {book.totalIn.toFixed(2)}</p>
        <p>Total out: {book.totalOut.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Closing balance: {book.closingBalance.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
