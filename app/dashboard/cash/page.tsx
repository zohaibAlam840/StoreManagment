import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCashBook, startOfDay, endOfDay } from "@/lib/cash";
import { paymentModeLabels, type CashMode } from "@/lib/db/schema";

// "adjustment" is a bookkeeping entry, not real money moving — it gets a
// filter option on the full book but not its own summary card here.
const OVERVIEW_MODES: CashMode[] = ["cash", "card", "easypaisa", "jazzcash", "bank_transfer"];

export default async function CashPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(now);

  const books = await Promise.all(OVERVIEW_MODES.map((mode) => getCashBook(mode, from, to)));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Cash Management
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/cash/payments/new" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Record customer payment
          </Link>
          <Link href="/dashboard/cash/supplier-payments/new" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Record supplier payment
          </Link>
          <Link href="/dashboard/cash/transactions/new" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Record cash/bank entry
          </Link>
          <Link href="/dashboard/cash/closing" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white dark:bg-accent dark:text-white">
            Daily closing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {OVERVIEW_MODES.map((mode, i) => {
          const book = books[i];
          return (
            <div key={mode} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {paymentModeLabels[mode]} (today)
                </h2>
                <Link href={`/dashboard/cash/book?mode=${mode}`} className="text-sm text-accent underline">
                  View
                </Link>
              </div>
              <p className="text-sm text-zinc-500">In: {book.totalIn.toFixed(2)}</p>
              <p className="text-sm text-zinc-500">Out: {book.totalOut.toFixed(2)}</p>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Closing balance: {book.closingBalance.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
