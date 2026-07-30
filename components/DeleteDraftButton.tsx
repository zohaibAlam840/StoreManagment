"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDraft } from "@/lib/actions/invoices";

export function DeleteDraftButton({ draftId }: { draftId: number }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function handleDelete() {
    setWorking(true);
    await deleteDraft(draftId);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={working}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
