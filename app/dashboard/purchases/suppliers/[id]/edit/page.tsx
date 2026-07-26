import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { updateSupplier, setSupplierActive } from "@/lib/actions/suppliers";
import { getSupplierCurrentBalance } from "@/lib/suppliers";
import { SupplierForm } from "@/components/SupplierForm";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const supplierId = Number(id);
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
  if (!supplier) notFound();

  const balance = await getSupplierCurrentBalance(supplierId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Edit {supplier.name}
        </h1>
        <form action={setSupplierActive.bind(null, supplierId, !supplier.active)}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            {supplier.active ? "Deactivate" : "Activate"}
          </button>
        </form>
      </div>
      <p className="mb-4 text-sm text-zinc-500">Current balance: {balance.toFixed(2)}</p>
      <SupplierForm
        action={updateSupplier.bind(null, supplierId)}
        defaultValues={supplier}
        submitLabel="Save changes"
      />
    </div>
  );
}
