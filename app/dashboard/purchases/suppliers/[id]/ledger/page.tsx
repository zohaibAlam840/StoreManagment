import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSupplierLedger } from "@/lib/suppliers";

export default async function SupplierLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const supplierId = Number(id);
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
  if (!supplier) notFound();

  const ledger = await getSupplierLedger(supplierId);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {supplier.name} — Ledger
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Date</th>
              <th className="py-2">Description</th>
              <th className="py-2">We owe (+)</th>
              <th className="py-2">Paid (-)</th>
              <th className="py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">—</td>
              <td className="py-2">Opening balance</td>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2">{supplier.openingBalance.toFixed(2)}</td>
            </tr>
            {ledger.map((e, i) => (
              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{e.date.toLocaleDateString()}</td>
                <td className="py-2">{e.description}</td>
                <td className="py-2">{e.credit ? e.credit.toFixed(2) : ""}</td>
                <td className="py-2">{e.debit ? e.debit.toFixed(2) : ""}</td>
                <td className="py-2">{e.runningBalance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
