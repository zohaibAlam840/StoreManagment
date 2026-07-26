import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { createSupplier } from "@/lib/actions/suppliers";
import { SupplierForm } from "@/components/SupplierForm";

export default async function NewSupplierPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Add supplier
      </h1>
      <SupplierForm action={createSupplier} submitLabel="Create supplier" />
    </div>
  );
}
