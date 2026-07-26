import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getReceivables } from "@/lib/reports";

export default async function ReceivablesReportPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const receivables = await getReceivables();
  const total = receivables.reduce((s, r) => s + r.balance, 0);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Receivables
      </h1>

      <div className="overflow-x-auto">
      <table className="w-full max-w-2xl text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Customer</th>
            <th className="py-2">Balance</th>
            <th className="py-2">Credit limit</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{r.name}</td>
              <td className={`py-2 ${r.overLimit ? "font-semibold text-red-600" : ""}`}>
                {r.balance.toFixed(2)}
              </td>
              <td className="py-2">{r.creditLimit?.toFixed(2) ?? "—"}</td>
              <td className="py-2">
                {r.overLimit && (
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                    Over limit
                  </span>
                )}
                <Link href={`/dashboard/reports/receivables/${r.id}`} className="ml-2 text-zinc-600 underline dark:text-zinc-400">
                  Ledger
                </Link>
              </td>
            </tr>
          ))}
          {receivables.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-zinc-500">No outstanding balances.</td></tr>
          )}
        </tbody>
      </table>
      </div>

      <p className="mt-4 max-w-2xl text-right text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Total receivable: {total.toFixed(2)}
      </p>
    </div>
  );
}
