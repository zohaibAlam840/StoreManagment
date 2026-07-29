"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/actions/purchaseOrders";

type SupplierOption = { id: number; name: string };
type ProductOption = { id: number; sku: string; name: string; unit: string; costPrice: number };
type LineItem = { productId: number; name: string; unit: string; qty: number; expectedCost: number };

export function PurchaseOrderForm({
  suppliers,
  products,
}: {
  suppliers: SupplierOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [productQuery, products]);

  function addProduct(p: ProductOption) {
    setProductQuery("");
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, unit: p.unit, qty: 1, expectedCost: p.costPrice }];
    });
  }

  function updateLine(productId: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function submit() {
    if (!supplierId) {
      setError("Select a supplier first.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createPurchaseOrder({
        supplierId: Number(supplierId),
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, expectedCost: l.expectedCost })),
      });
      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      router.push("/dashboard/purchases/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create purchase order");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Supplier</span>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Select supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Add product
        </label>
        <input
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          placeholder="Type to search products..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {productMatches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            {productMatches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  {p.name} <span className="text-zinc-400">({p.sku})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Product</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Expected cost</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.productId} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{l.name}</td>
              <td className="py-2">
                <input
                  type="number"
                  step="0.01"
                  value={l.qty}
                  onChange={(e) => updateLine(l.productId, { qty: Number(e.target.value) })}
                  className="w-20 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </td>
              <td className="py-2">
                <input
                  type="number"
                  step="0.01"
                  value={l.expectedCost}
                  onChange={(e) => updateLine(l.productId, { expectedCost: Number(e.target.value) })}
                  className="w-24 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => removeLine(l.productId)}
                  className="text-xs text-red-600 underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-500">
                No products added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Saving..." : "Create purchase order"}
      </button>
    </div>
  );
}
