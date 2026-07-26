"use client";

import { useActionState } from "react";
import { importProductsCsv } from "@/lib/actions/products";

export function ImportProductsForm() {
  const [state, formAction, pending] = useActionState(importProductsCsv, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Import products CSV</span>
        <input name="file" type="file" accept=".csv,text/csv" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Importing..." : "Import"}
      </button>
      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-600">Imported {state.count} products.</p>
      )}
    </form>
  );
}
