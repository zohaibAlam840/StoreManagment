import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { updateProduct, setProductActive } from "@/lib/actions/products";
import { ProductForm } from "@/components/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const productId = Number(id);
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Edit {product.name}
        </h1>
        <form action={setProductActive.bind(null, productId, !product.active)}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            {product.active ? "Deactivate" : "Activate"}
          </button>
        </form>
      </div>
      <ProductForm
        action={updateProduct.bind(null, productId)}
        defaultValues={product}
        submitLabel="Save changes"
      />
    </div>
  );
}
