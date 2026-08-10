"use client";

import { useActionState } from "react";
import { adjustStock } from "@/lib/actions/inventory";

export function StockAdjustmentForm({
  products,
}: {
  products: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(adjustStock, undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Product</span>
        <select
          name="productId"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</span>
          <select
            name="type"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="adjustment">Adjustment (+/-)</option>
            <option value="damage">Damage (loss)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Quantity</span>
          <input
            name="qty"
            type="number"
            step="0.01"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Note</span>
        <input
          name="note"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
      >
        {pending ? "Saving..." : "Record adjustment"}
      </button>
    </form>
  );
}
