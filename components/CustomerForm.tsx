type CustomerFormValues = {
  name?: string;
  phone?: string | null;
  address?: string | null;
  openingBalance?: number;
  creditLimit?: number | null;
};

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: CustomerFormValues;
  submitLabel: string;
}) {
  const v = defaultValues ?? {};

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <Field label="Name">
        <input name="name" defaultValue={v.name} required className={inputClass} />
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={v.phone ?? ""} className={inputClass} />
      </Field>
      <Field label="Address">
        <textarea name="address" defaultValue={v.address ?? ""} className={inputClass} rows={2} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Opening balance">
          <input
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue={v.openingBalance ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Credit limit">
          <input
            name="creditLimit"
            type="number"
            step="0.01"
            defaultValue={v.creditLimit ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        type="submit"
        className="mt-2 w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white dark:bg-accent dark:text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}
