"use client";

import { useActionState } from "react";
import { importCustomersCsv } from "@/lib/actions/customers";

export function ImportCustomersForm() {
  const [state, formAction, pending] = useActionState(importCustomersCsv, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Import customers CSV</span>
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
        <p className="text-sm text-emerald-600">Imported {state.count} customers.</p>
      )}
    </form>
  );
}
