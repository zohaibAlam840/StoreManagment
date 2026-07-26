import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { createCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Add customer
      </h1>
      <CustomerForm action={createCustomer} submitLabel="Create customer" />
    </div>
  );
}
