import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { invoices, invoiceLines, products, salesReturnLines, salesReturns } from "@/lib/db/schema";
import { SalesReturnForm } from "@/components/SalesReturnForm";

export default async function SalesReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = Number(id);

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice || invoice.status !== "posted") notFound();

  const [originalLines, returnedRows] = await Promise.all([
    db
      .select({
        productId: invoiceLines.productId,
        qty: invoiceLines.qty,
        productName: products.name,
        unit: products.unit,
      })
      .from(invoiceLines)
      .leftJoin(products, eq(invoiceLines.productId, products.id))
      .where(eq(invoiceLines.invoiceId, invoiceId)),
    db
      .select({ productId: salesReturnLines.productId, qty: salesReturnLines.qty })
      .from(salesReturnLines)
      .innerJoin(salesReturns, eq(salesReturnLines.salesReturnId, salesReturns.id))
      .where(eq(salesReturns.invoiceId, invoiceId)),
  ]);

  const returnedByProduct = new Map<number, number>();
  for (const r of returnedRows) {
    returnedByProduct.set(r.productId, (returnedByProduct.get(r.productId) ?? 0) + r.qty);
  }

  const lines = originalLines.map((l) => ({
    productId: l.productId,
    name: l.productName ?? `#${l.productId}`,
    unit: l.unit ?? "pcs",
    originalQty: l.qty,
    alreadyReturned: returnedByProduct.get(l.productId) ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Return items — Invoice #{invoice.number}
      </h1>
      <SalesReturnForm invoiceId={invoiceId} lines={lines} />
    </div>
  );
}
