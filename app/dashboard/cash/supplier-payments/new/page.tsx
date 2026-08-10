import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { suppliers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordSupplierPayment } from "@/lib/actions/cash";

export default async function NewSupplierPaymentPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const allSuppliers = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.active, true));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Record supplier payment
      </h1>
      <form action={recordSupplierPayment} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Supplier</span>
          <select name="supplierId" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {allSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount</span>
          <input name="amount" type="number" step="0.01" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode</span>
          <select name="mode" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </label>
        <button type="submit" className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white dark:bg-accent dark:text-white">
          Record payment
        </button>
      </form>
    </div>
  );
}
