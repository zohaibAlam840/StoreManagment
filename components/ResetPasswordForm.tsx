"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/actions/users";

export function ResetPasswordForm({ userId }: { userId: number }) {
  const [state, formAction, pending] = useActionState(resetPassword.bind(null, userId), undefined);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New password</span>
        <input name="password" type="password" required autoComplete="new-password" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? "Saving..." : "Reset password"}
      </button>
    </form>
  );
}
