"use client";

import { useActionState } from "react";
import { restoreBackup } from "@/lib/actions/backup";

export function RestoreBackupForm() {
  const [state, formAction, pending] = useActionState(restoreBackup, undefined);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Backup file</span>
        <input name="file" type="file" accept="application/json" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Type RESTORE to confirm — this replaces all current data
        </span>
        <input name="confirmation" required className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </label>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-600">
          Restore complete. Log in again if your session no longer works.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Restoring..." : "Restore from backup"}
      </button>
    </form>
  );
}
