import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { invoices, invoiceLines, customers, products } from "@/lib/db/schema";
import { getCustomerBalanceBefore, getLastDeliveryDateBefore } from "@/lib/customers";
import { InvoiceActions } from "@/components/InvoiceActions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = Number(id);

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) notFound();

  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId));

  const lines = await db
    .select({
      qty: invoiceLines.qty,
      rate: invoiceLines.rate,
      productName: products.name,
      unit: products.unit,
    })
    .from(invoiceLines)
    .leftJoin(products, eq(invoiceLines.productId, products.id))
    .where(eq(invoiceLines.invoiceId, invoiceId));

  const previousBalance = await getCustomerBalanceBefore(invoice.customerId, invoice.date);
  const lastDeliveryDate = await getLastDeliveryDateBefore(invoice.customerId, invoice.date);

  const whatsappText = [
    `Invoice #${invoice.number}`,
    `Customer: ${customer?.name ?? ""}`,
    `Date: ${invoice.date.toLocaleDateString()}`,
    ...lines.map((l) => `${l.productName} x${l.qty} @ ${l.rate.toFixed(2)} = ${(l.qty * l.rate).toFixed(2)}`),
    `Total: ${invoice.total.toFixed(2)}`,
  ].join("\n");

  return (
    <div>
      <InvoiceActions
        invoiceId={invoice.id}
        status={invoice.status}
        customerPhone={customer?.phone ?? null}
        whatsappText={whatsappText}
      />

      <div
        id="invoice-print"
        className="mx-auto max-w-sm bg-white p-4 font-mono text-sm text-black print:max-w-none"
      >
        {invoice.status === "void" && (
          <p className="text-center text-base font-bold text-red-600">*** VOID ***</p>
        )}
        <h1 className="text-center text-base font-bold">INVOICE</h1>
        <p className="text-center">#{invoice.number}</p>
        <p className="text-center">{invoice.date.toLocaleString()}</p>
        <hr className="my-2 border-dashed border-black" />
        <p>Customer: {customer?.name ?? "—"}</p>
        {customer?.phone && <p>Phone: {customer.phone}</p>}
        <p>Previous balance: {previousBalance.toFixed(2)}</p>
        <p>
          Last delivery: {lastDeliveryDate ? lastDeliveryDate.toLocaleDateString() : "—"}
        </p>
        <hr className="my-2 border-dashed border-black" />
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{l.productName}</td>
                <td className="text-right">
                  {l.qty} {l.unit}
                </td>
                <td className="text-right">{l.rate.toFixed(2)}</td>
                <td className="text-right">{(l.qty * l.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-right">Subtotal: {invoice.subtotal.toFixed(2)}</p>
        <p className="text-right">Discount: {invoice.discountAmount.toFixed(2)}</p>
        <p className="text-right text-base font-bold">Total: {invoice.total.toFixed(2)}</p>
        <p className="text-right">
          New balance: {(previousBalance + invoice.total).toFixed(2)}
        </p>
        <p className="mt-2 capitalize">Payment mode: {invoice.paymentMode.replace("_", " ")}</p>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">Thank you!</p>
      </div>
    </div>
  );
}
