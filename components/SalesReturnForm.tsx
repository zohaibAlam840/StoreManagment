"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSalesReturn } from "@/lib/actions/salesReturns";

type LineOption = {
  productId: number;
  name: string;
  unit: string;
  originalQty: number;
  alreadyReturned: number;
};

export function SalesReturnForm({ invoiceId, lines }: { invoiceId: number; lines: LineOption[] }) {
  const router = useRouter();
  const [qtyByProduct, setQtyByProduct] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const selected = Object.entries(qtyByProduct)
      .map(([productId, qty]) => ({ productId: Number(productId), qty }))
      .filter((l) => l.qty > 0);

    if (selected.length === 0) {
      setError("Enter a return quantity for at least one item.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createSalesReturn(invoiceId, selected, reason);
    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push(`/dashboard/invoices/${invoiceId}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Product</th>
            <th className="py-2">Sold</th>
            <th className="py-2">Already returned</th>
            <th className="py-2">Return qty</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const remaining = l.originalQty - l.alreadyReturned;
            return (
              <tr key={l.productId} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{l.name}</td>
                <td className="py-2">{l.originalQty} {l.unit}</td>
                <td className="py-2">{l.alreadyReturned} {l.unit}</td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={remaining}
                    disabled={remaining <= 0}
                    value={qtyByProduct[l.productId] ?? ""}
                    onChange={(e) =>
                      setQtyByProduct((prev) => ({ ...prev, [l.productId]: Number(e.target.value) }))
                    }
                    className="w-24 rounded-md border border-zinc-300 px-2 py-1 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reason</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Damaged, wrong item, customer changed mind"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
      >
        {submitting ? "Processing..." : "Process return"}
      </button>
    </div>
  );
}
