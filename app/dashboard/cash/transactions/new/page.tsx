import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordCashTransaction } from "@/lib/actions/cash";

export default async function NewCashTransactionPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Record cash / bank entry
      </h1>
      <p className="mb-4 text-sm text-zinc-500">
        For anything not already covered by a sales invoice, customer payment,
        or supplier payment — e.g. rent, utilities, owner withdrawals.
      </p>
      <form action={recordCashTransaction} className="flex max-w-md flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Direction</span>
            <select name="direction" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <option value="out">Money out</option>
              <option value="in">Money in</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode</span>
            <select name="mode" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount</span>
          <input name="amount" type="number" step="0.01" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</span>
          <input name="category" required placeholder="e.g. Rent, Utilities, Owner withdrawal" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Note</span>
          <input name="note" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <button type="submit" className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
          Record entry
        </button>
      </form>
    </div>
  );
}
