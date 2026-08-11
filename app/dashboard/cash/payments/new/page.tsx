import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { customers, tenderModes, paymentModeLabels } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordPayment } from "@/lib/actions/cash";
import { SubmitButton } from "@/components/SubmitButton";

export default async function NewPaymentPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const allCustomers = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.active, true));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Record customer payment
      </h1>
      <form action={recordPayment} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Customer</span>
          <select name="customerId" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {allCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
            {tenderModes.map((m) => (
              <option key={m} value={m}>
                {paymentModeLabels[m]}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton
          pendingLabel="Recording..."
          className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
        >
          Record payment
        </SubmitButton>
      </form>
    </div>
  );
}
