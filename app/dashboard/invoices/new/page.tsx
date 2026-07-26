import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, products } from "@/lib/db/schema";
import { getStockOnHandMany } from "@/lib/inventory";
import { InvoiceForm } from "@/components/InvoiceForm";

export default async function NewInvoicePage() {
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

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        New sales invoice
      </h1>
      <InvoiceForm customers={allCustomers} products={allProducts} stock={stock} />
    </div>
  );
}
