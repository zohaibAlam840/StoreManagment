"use client";

import { useFormStatus } from "react-dom";

// useFormStatus only sees the pending state of the nearest ancestor <form>,
// so this has to be its own client component rendered *inside* the form —
// it can't just be a `disabled={pending}` prop on a plain button in the
// same (often server) component that renders the <form> itself. Without
// this, a plain `<button type="submit">` never disables, so a slow Server
// Action plus repeated clicks creates one DB row per click.
export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
