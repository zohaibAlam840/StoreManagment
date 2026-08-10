"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--background)] p-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
            W
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sign in
          </h1>
        </div>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Username
        </label>
        <input
          name="username"
          autoFocus
          autoComplete="username"
          className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />

        {state?.error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
