type ProductFormValues = {
  sku?: string;
  name?: string;
  brand?: string | null;
  category?: string | null;
  packingUnit?: string | null;
  company?: string | null;
  unit?: string;
  costPrice?: number;
  minSellingPrice?: number;
  minStock?: number;
  maxStock?: number | null;
  reorderLevel?: number;
  imageUrl?: string | null;
};

export function ProductForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: ProductFormValues;
  submitLabel: string;
}) {
  const v = defaultValues ?? {};

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <Field label="SKU">
        <input name="sku" defaultValue={v.sku} required className={inputClass} />
      </Field>
      <Field label="Name">
        <input name="name" defaultValue={v.name} required className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Brand">
          <input name="brand" defaultValue={v.brand ?? ""} className={inputClass} />
        </Field>
        <Field label="Category">
          <input name="category" defaultValue={v.category ?? ""} className={inputClass} />
        </Field>
        <Field label="Company">
          <input name="company" defaultValue={v.company ?? ""} className={inputClass} />
        </Field>
        <Field label="Packing / SKU unit">
          <input
            name="packingUnit"
            defaultValue={v.packingUnit ?? ""}
            placeholder="e.g. Carton of 24"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit of measure">
          <input name="unit" defaultValue={v.unit ?? "pcs"} className={inputClass} />
        </Field>
        <Field label="Product image">
          <input name="image" type="file" accept="image/*" className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cost price">
          <input
            name="costPrice"
            type="number"
            step="0.01"
            defaultValue={v.costPrice ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Minimum selling price">
          <input
            name="minSellingPrice"
            type="number"
            step="0.01"
            defaultValue={v.minSellingPrice ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Min stock">
          <input
            name="minStock"
            type="number"
            step="0.01"
            defaultValue={v.minStock ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Max stock">
          <input
            name="maxStock"
            type="number"
            step="0.01"
            defaultValue={v.maxStock ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Reorder level">
          <input
            name="reorderLevel"
            type="number"
            step="0.01"
            defaultValue={v.reorderLevel ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        type="submit"
        className="mt-2 w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
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
