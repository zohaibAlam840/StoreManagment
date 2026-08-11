import { SubmitButton } from "@/components/SubmitButton";

type SupplierFormValues = {
  name?: string;
  phone?: string | null;
  address?: string | null;
  openingBalance?: number;
};

export function SupplierForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: SupplierFormValues;
  submitLabel: string;
}) {
  const v = defaultValues ?? {};

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</span>
        <input name="name" defaultValue={v.name} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone</span>
        <input name="phone" defaultValue={v.phone ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Address</span>
        <textarea name="address" defaultValue={v.address ?? ""} className={inputClass} rows={2} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Opening balance (what we owe them)
        </span>
        <input
          name="openingBalance"
          type="number"
          step="0.01"
          defaultValue={v.openingBalance ?? 0}
          className={inputClass}
        />
      </label>

      <SubmitButton
        pendingLabel="Saving..."
        className="mt-2 w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
