"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, getInvoiceFormData } from "@/lib/actions/invoices";
import type { PaymentMode } from "@/lib/db/schema";

type CustomerOption = { id: number; name: string; phone: string | null };
type ProductOption = {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  unit: string;
  minSellingPrice: number;
  costPrice: number;
};

type LineItem = {
  productId: number;
  name: string;
  unit: string;
  qty: number;
  rate: number;
  costPrice: number;
};

const RECENT_PRODUCTS_KEY = "recentProductIds";
const RECENT_LIMIT = 20;

function loadRecentProductIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PRODUCTS_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function pushRecentProductId(id: number) {
  const current = loadRecentProductIds().filter((existing) => existing !== id);
  current.unshift(id);
  window.localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(current.slice(0, RECENT_LIMIT)));
}

export function InvoiceForm({
  customers,
  products,
  stock,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  stock: Record<number, number>;
}) {
  const router = useRouter();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);
  const [lastDeliveryDate, setLastDeliveryDate] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<number, number>>({});
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const customerMatches = useMemo(() => {
    if (!customerQuery || customer) return [];
    const q = customerQuery.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customerQuery, customer, customers]);

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    const recent = loadRecentProductIds();
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q)
    );
    matches.sort((a, b) => {
      const ra = recent.indexOf(a.id);
      const rb = recent.indexOf(b.id);
      if (ra !== -1 || rb !== -1) {
        if (ra === -1) return 1;
        if (rb === -1) return -1;
        return ra - rb;
      }
      return a.name.localeCompare(b.name);
    });
    return matches.slice(0, 8);
  }, [productQuery, products]);

  async function selectCustomer(c: CustomerOption) {
    setCustomer(c);
    setCustomerQuery(c.name);
    setPreviousBalance(null);
    setRates({});
    setLoadingCustomer(true);
    try {
      const data = await getInvoiceFormData(c.id);
      setPreviousBalance(data.previousBalance);
      setLastDeliveryDate(data.lastDeliveryDate);
      setRates(data.rates as Record<number, number>);
    } finally {
      setLoadingCustomer(false);
    }
  }

  function addProduct(p: ProductOption) {
    pushRecentProductId(p.id);
    setProductQuery("");
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      const rate = rates[p.id] ?? p.minSellingPrice;
      return [...prev, { productId: p.id, name: p.name, unit: p.unit, qty: 1, rate, costPrice: p.costPrice }];
    });
  }

  function updateLine(productId: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
  const total = subtotal - discountAmount;

  async function submit() {
    if (!customer) {
      setError("Select a customer first.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createInvoice({
        customerId: customer.id,
        paymentMode,
        discountAmount,
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: l.rate })),
      });
      if ("pending" in result && result.pending) {
        setPendingMessage(
          "One or more items are priced below cost or minimum margin, so this invoice needs admin approval before it's finalized. It won't appear as a sale until approved."
        );
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/invoices/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invoice");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Customer
        </label>
        <input
          value={customerQuery}
          onChange={(e) => {
            setCustomerQuery(e.target.value);
            setCustomer(null);
          }}
          placeholder="Type customer name..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {customerMatches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            {customerMatches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
        {customer && previousBalance !== null && (
          <p className="mt-2 text-sm text-zinc-500">
            Previous balance: <strong>{previousBalance.toFixed(2)}</strong> · Last delivery:{" "}
            <strong>{lastDeliveryDate ? new Date(lastDeliveryDate).toLocaleDateString() : "—"}</strong>
          </p>
        )}
      </div>

      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Add product
        </label>
        <input
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          placeholder={
            !customer
              ? "Select a customer first..."
              : loadingCustomer
                ? "Loading customer rates..."
                : "Type to search products..."
          }
          disabled={!customer || loadingCustomer}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {productMatches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            {productMatches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <span>
                    {p.name} <span className="text-zinc-400">({p.sku})</span>
                  </span>
                  <span className="text-zinc-400">stock: {stock[p.id] ?? 0}</span>
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
            <th className="py-2">Rate</th>
            <th className="py-2">Amount</th>
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
                  value={l.rate}
                  onChange={(e) => updateLine(l.productId, { rate: Number(e.target.value) })}
                  className={`w-24 rounded-md border px-2 py-1 dark:bg-zinc-900 ${
                    l.rate < l.costPrice
                      ? "border-red-400 text-red-600"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                />
                {l.rate < l.costPrice && (
                  <p className="text-xs text-red-500">below cost</p>
                )}
              </td>
              <td className="py-2">{(l.qty * l.rate).toFixed(2)}</td>
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
              <td colSpan={5} className="py-4 text-zinc-500">
                No products added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payment mode</span>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Discount amount</span>
          <input
            type="number"
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(Number(e.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <div className="flex flex-col items-end gap-1 text-sm">
        <p>Subtotal: {subtotal.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Total: {total.toFixed(2)}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {pendingMessage && <p className="text-sm text-amber-600">{pendingMessage}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !!pendingMessage}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Saving..." : "Create invoice"}
      </button>
    </div>
  );
}
