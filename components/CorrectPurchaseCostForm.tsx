"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { correctPurchaseLineCost } from "@/lib/actions/purchases";

export function CorrectPurchaseCostForm({ lineId, currentCost }: { lineId: number; currentCost: number }) {
  const router = useRouter();
  const [cost, setCost] = useState(currentCost);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-zinc-500 underline">
        Correct
      </button>
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await correctPurchaseLineCost(lineId, cost);
    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-20 rounded-md border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="button" onClick={save} disabled={saving} className="text-xs text-emerald-600 underline disabled:opacity-50">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-zinc-500 underline">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
