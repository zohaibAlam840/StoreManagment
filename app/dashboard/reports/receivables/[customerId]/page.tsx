import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { customers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCustomerLedger } from "@/lib/customers";

// Read-only for both roles: a salesman can see a customer's ledger balance
// and history (requirement #14), just not edit customer details/rates,
// which stay admin-only on the Customers page itself.
export default async function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await getCurrentUser();

  const { customerId } = await params;
  const id = Number(customerId);
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  if (!customer) notFound();

  const ledger = await getCustomerLedger(id);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {customer.name} — Ledger
      </h1>

      <div className="overflow-x-auto">
      <table className="w-full max-w-2xl text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Date</th>
            <th className="py-2">Description</th>
            <th className="py-2">Debit</th>
            <th className="py-2">Credit</th>
            <th className="py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">—</td>
            <td className="py-2">Opening balance</td>
            <td className="py-2"></td>
            <td className="py-2"></td>
            <td className="py-2">{customer.openingBalance.toFixed(2)}</td>
          </tr>
          {ledger.map((e, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{e.date.toLocaleDateString()}</td>
              <td className="py-2">{e.description}</td>
              <td className="py-2">{e.debit ? e.debit.toFixed(2) : ""}</td>
              <td className="py-2">{e.credit ? e.credit.toFixed(2) : ""}</td>
              <td className="py-2">{e.runningBalance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
