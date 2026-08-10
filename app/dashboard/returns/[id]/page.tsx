import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { salesReturns, salesReturnLines, customers, invoices, products, users } from "@/lib/db/schema";

export default async function SalesReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnId = Number(id);

  const [salesReturn] = await db.select().from(salesReturns).where(eq(salesReturns.id, returnId));
  if (!salesReturn) notFound();

  const [customer] = await db.select().from(customers).where(eq(customers.id, salesReturn.customerId));
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, salesReturn.invoiceId));
  const [createdBy] = await db.select().from(users).where(eq(users.id, salesReturn.createdBy));

  const lines = await db
    .select({
      id: salesReturnLines.id,
      qty: salesReturnLines.qty,
      rate: salesReturnLines.rate,
      productName: products.name,
      unit: products.unit,
    })
    .from(salesReturnLines)
    .leftJoin(products, eq(salesReturnLines.productId, products.id))
    .where(eq(salesReturnLines.salesReturnId, returnId));

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Sales Return #{salesReturn.number}
      </h1>
      <p className="mb-1 text-sm">Customer: {customer?.name ?? "—"}</p>
      <p className="mb-1 text-sm">Date: {salesReturn.date.toLocaleString()}</p>
      <p className="mb-1 text-sm">
        Against invoice:{" "}
        {invoice ? (
          <Link href={`/dashboard/invoices/${invoice.id}`} className="underline">
            #{invoice.number}
          </Link>
        ) : (
          "—"
        )}
      </p>
      {salesReturn.reason && <p className="mb-1 text-sm">Reason: {salesReturn.reason}</p>}
      <p className="mb-4 text-sm">Recorded by: {createdBy?.name ?? "—"}</p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Product</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Rate</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{l.productName}</td>
                <td className="py-2">
                  {l.qty} {l.unit}
                </td>
                <td className="py-2">{l.rate.toFixed(2)}</td>
                <td className="py-2">{(l.qty * l.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Total credited: {salesReturn.total.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
