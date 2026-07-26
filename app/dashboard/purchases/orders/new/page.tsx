import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers, products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";

export default async function NewPurchaseOrderPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const [allSuppliers, allProducts] = await Promise.all([
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.active, true)),
    db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        unit: products.unit,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(eq(products.active, true)),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        New purchase order
      </h1>
      <PurchaseOrderForm suppliers={allSuppliers} products={allProducts} />
    </div>
  );
}
