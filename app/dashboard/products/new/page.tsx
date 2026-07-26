import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { createProduct } from "@/lib/actions/products";
import { ProductForm } from "@/components/ProductForm";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Add product
      </h1>
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}
