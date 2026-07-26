import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { customers, customerRates, products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  updateCustomer,
  setCustomerActive,
  setCustomerRate,
  deleteCustomerRate,
} from "@/lib/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const customerId = Number(id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) notFound();

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(products.name);

  const rates = await db
    .select()
    .from(customerRates)
    .where(eq(customerRates.customerId, customerId));

  const rateByProduct = new Map(rates.map((r) => [r.productId, r]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Edit {customer.name}
          </h1>
          <form action={setCustomerActive.bind(null, customerId, !customer.active)}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              {customer.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
        <CustomerForm
          action={updateCustomer.bind(null, customerId)}
          defaultValues={customer}
          submitLabel="Save changes"
        />
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Customer-wise product rates
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Set a special rate per product for this customer. It will be
          suggested automatically when invoicing them (Phase 2).
        </p>
        <div className="overflow-x-auto">
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Product</th>
              <th className="py-2">Min selling price</th>
              <th className="py-2">Customer rate</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allProducts.map((p) => {
              const rate = rateByProduct.get(p.id);
              return (
                <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.minSellingPrice.toFixed(2)}</td>
                  <td className="py-2">
                    <form
                      action={setCustomerRate.bind(null, customerId, p.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="rate"
                        type="number"
                        step="0.01"
                        defaultValue={rate?.rate ?? ""}
                        className="w-28 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                      >
                        Set
                      </button>
                    </form>
                  </td>
                  <td className="py-2">
                    {rate && (
                      <form action={deleteCustomerRate.bind(null, customerId, rate.id)}>
                        <button type="submit" className="text-xs text-red-600 underline">
                          Remove
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {allProducts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-zinc-500">
                  No products yet — add some in Products first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
