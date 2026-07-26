import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCashBook, startOfDay, endOfDay } from "@/lib/cash";

export default async function CashPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(now);

  const [cashToday, bankToday] = await Promise.all([
    getCashBook("cash", from, to),
    getCashBook("bank_transfer", from, to),
  ]);

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
          <Link href="/dashboard/cash/closing" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            Daily closing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Cash book (today)</h2>
            <Link href="/dashboard/cash/book?mode=cash" className="text-sm text-zinc-600 underline dark:text-zinc-400">
              View full book
            </Link>
          </div>
          <p className="text-sm">In: {cashToday.totalIn.toFixed(2)}</p>
          <p className="text-sm">Out: {cashToday.totalOut.toFixed(2)}</p>
          <p className="text-sm">Opening balance: {cashToday.openingBalance.toFixed(2)}</p>
          <p className="text-base font-semibold">Closing balance: {cashToday.closingBalance.toFixed(2)}</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Bank book (today)</h2>
            <Link href="/dashboard/cash/book?mode=bank_transfer" className="text-sm text-zinc-600 underline dark:text-zinc-400">
              View full book
            </Link>
          </div>
          <p className="text-sm">In: {bankToday.totalIn.toFixed(2)}</p>
          <p className="text-sm">Out: {bankToday.totalOut.toFixed(2)}</p>
          <p className="text-sm">Opening balance: {bankToday.openingBalance.toFixed(2)}</p>
          <p className="text-base font-semibold">Closing balance: {bankToday.closingBalance.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
