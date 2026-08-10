import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { ImportProductsForm } from "@/components/ImportProductsForm";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const allProducts = await db.select().from(products).orderBy(products.name);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Products
        </h1>
        <div className="flex gap-2">
          <a
            href="/api/products/export"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Export CSV
          </a>
          <Link
            href="/dashboard/products/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white dark:bg-accent dark:text-white"
          >
            Add product
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <ImportProductsForm />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2"></th>
            <th className="py-2">SKU</th>
            <th className="py-2">Name</th>
            <th className="py-2">Brand</th>
            <th className="py-2">Category</th>
            <th className="py-2">Company</th>
            <th className="py-2">Cost</th>
            <th className="py-2">Min sell</th>
            <th className="py-2">Active</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {allProducts.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    width={32}
                    height={32}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-zinc-100 dark:bg-zinc-900" />
                )}
              </td>
              <td className="py-2">{p.sku}</td>
              <td className="py-2">{p.name}</td>
              <td className="py-2">{p.brand ?? "—"}</td>
              <td className="py-2">{p.category ?? "—"}</td>
              <td className="py-2">{p.company ?? "—"}</td>
              <td className="py-2">{p.costPrice.toFixed(2)}</td>
              <td className="py-2">{p.minSellingPrice.toFixed(2)}</td>
              <td className="py-2">{p.active ? "Yes" : "No"}</td>
              <td className="py-2">
                <Link
                  href={`/dashboard/products/${p.id}/edit`}
                  className="text-zinc-600 underline dark:text-zinc-400"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
          {allProducts.length === 0 && (
            <tr>
              <td colSpan={9} className="py-4 text-zinc-500">
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
