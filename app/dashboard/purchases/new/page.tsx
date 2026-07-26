import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers, products, purchaseOrderLines } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { PurchaseForm } from "@/components/PurchaseForm";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string; supplierId?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { poId, supplierId } = await searchParams;

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

  let initialLines;
  if (poId) {
    const poLines = await db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, Number(poId)));
    const productById = new Map(allProducts.map((p) => [p.id, p]));
    initialLines = poLines
      .map((l) => {
        const p = productById.get(l.productId);
        if (!p) return null;
        return { productId: p.id, name: p.name, unit: p.unit, qty: l.qty, cost: l.expectedCost };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        New purchase
      </h1>
      <PurchaseForm
        suppliers={allSuppliers}
        products={allProducts}
        purchaseOrderId={poId ? Number(poId) : undefined}
        initialLines={initialLines}
        initialSupplierId={supplierId ? Number(supplierId) : undefined}
      />
    </div>
  );
}
