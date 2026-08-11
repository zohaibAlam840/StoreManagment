import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { customers, products } from "@/lib/db/schema";
import { getAllStockOnHand } from "@/lib/inventory";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDraft, listDrafts } from "@/lib/actions/invoices";
import { InvoiceForm } from "@/components/InvoiceForm";
import { DeleteDraftButton } from "@/components/DeleteDraftButton";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const user = await getCurrentUser();
  const { draft: draftIdParam } = await searchParams;

  // All independent of each other, so they run as one round trip instead of
  // three sequential ones — the dominant cost on a remote DB is per-query
  // latency, not query complexity.
  const [allCustomers, allProducts, stockMap, draft, drafts] = await Promise.all([
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
    getAllStockOnHand(),
    draftIdParam ? getDraft(Number(draftIdParam)) : Promise.resolve(null),
    listDrafts(),
  ]);
  const stock = Object.fromEntries(stockMap.entries());

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {draft ? "Resume draft invoice" : "New sales invoice"}
      </h1>

      {!draft && drafts.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            You have {drafts.length} draft invoice{drafts.length > 1 ? "s" : ""} in progress. Resume
            one, or continue below to start a new invoice.
          </p>
          <ul className="flex flex-col gap-1">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center gap-3 text-sm">
                <Link href={`/dashboard/invoices/new?draft=${d.id}`} className="text-accent underline">
                  Resume — {d.customerName ?? "no customer"} ({d.total.toFixed(2)})
                </Link>
                <DeleteDraftButton draftId={d.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

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
