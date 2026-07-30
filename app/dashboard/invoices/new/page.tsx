import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, products } from "@/lib/db/schema";
import { getStockOnHandMany } from "@/lib/inventory";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDraft } from "@/lib/actions/invoices";
import { InvoiceForm } from "@/components/InvoiceForm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const user = await getCurrentUser();
  const { draft: draftIdParam } = await searchParams;

  const [allCustomers, allProducts] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers)
      .where(eq(customers.active, true)),
    db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        brand: products.brand,
        unit: products.unit,
        minSellingPrice: products.minSellingPrice,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(eq(products.active, true)),
  ]);

  const stockMap = await getStockOnHandMany(allProducts.map((p) => p.id));
  const stock = Object.fromEntries(stockMap.entries());

  const draft = draftIdParam ? await getDraft(Number(draftIdParam)) : null;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {draft ? "Resume draft invoice" : "New sales invoice"}
      </h1>
      <InvoiceForm
        customers={allCustomers}
        products={allProducts}
        stock={stock}
        userRole={user.role}
        draft={draft}
      />
    </div>
  );
}
