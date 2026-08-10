"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, getInvoiceFormData, saveDraft } from "@/lib/actions/invoices";
import { quickCreateCustomer } from "@/lib/actions/customers";
import { paymentModes, tenderModes, paymentModeLabels, type PaymentMode, type TenderMode } from "@/lib/db/schema";

// The invoice's own paymentMode is a sale classification, not a tender rail —
// "adjustment" only makes sense as a receipt line, never as how the whole
// sale is characterized.
const SALE_PAYMENT_MODES = paymentModes.filter((m) => m !== "adjustment");

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
  minSellingPrice: number;
};

type ReceiptLine = { key: number; mode: TenderMode; amount: number };

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

type DraftInitial = {
  id: number;
  customerId: number | null;
  paymentMode: PaymentMode;
  discountAmount: number;
  lines: { productId: number; qty: number; rate: number }[];
} | null;

export function InvoiceForm({
  customers,
  products,
  stock,
  userRole,
  draft,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  stock: Record<number, number>;
  userRole: "admin" | "salesman";
  draft?: DraftInitial;
}) {
  const router = useRouter();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [draftId, setDraftId] = useState<number | null>(draft?.id ?? null);
  // Local copy so a customer added inline via quick-add is immediately
  // searchable for the rest of this session, without waiting on a refetch.
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);
  const [lastDeliveryDate, setLastDeliveryDate] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<number, number>>({});
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (!draft) return [];
    return draft.lines
      .map((l) => {
        const p = productById.get(l.productId);
        if (!p) return null;
        return { productId: p.id, name: p.name, unit: p.unit, qty: l.qty, rate: l.rate, costPrice: p.costPrice, minSellingPrice: p.minSellingPrice };
      })
      .filter((l): l is LineItem => l !== null);
  });
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(draft?.paymentMode ?? "cash");
  const [discountAmount, setDiscountAmount] = useState(draft?.discountAmount ?? 0);

  // Split/partial payment: one or more tender lines (e.g. half cash, half
  // card). The single default line tracks the invoice total automatically
  // (most sales are paid in full on the spot) until the user adds another
  // line or edits an amount by hand, at which point auto-sync stops.
  const [receipts, setReceipts] = useState<ReceiptLine[]>([{ key: 0, mode: "cash", amount: 0 }]);
  const [receiptsTouched, setReceiptsTouched] = useState(false);
  const nextReceiptKey = useRef(1);

  const [overrideUsername, setOverrideUsername] = useState("");
  const [overridePassword, setOverridePassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Keyboard flow: Enter moves focus customer -> product search -> qty ->
  // rate -> back to product search for the next item, so a whole invoice can
  // be entered without touching the mouse.
  const customerInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const rateRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [pendingFocusProductId, setPendingFocusProductId] = useState<number | null>(null);

  useEffect(() => {
    if (pendingFocusProductId == null) return;
    const el = qtyRefs.current[pendingFocusProductId];
    if (el) {
      el.focus();
      el.select();
      setPendingFocusProductId(null);
    }
  }, [pendingFocusProductId, lines]);

  // Resume a draft's customer once (draft lines are already seeded in state).
  useEffect(() => {
    if (draft?.customerId) {
      const c = customerList.find((c) => c.id === draft.customerId);
      if (c) selectCustomer(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerMatches = useMemo(() => {
    if (!customerQuery || customer) return [];
    const q = customerQuery.toLowerCase();
    return customerList.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customerQuery, customer, customerList]);

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
      if ("error" in data) {
        setError(data.error);
        setCustomer(null);
        return;
      }
      setPreviousBalance(data.previousBalance);
      setLastDeliveryDate(data.lastDeliveryDate);
      setRates(data.rates as Record<number, number>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer details");
      setCustomer(null);
    } finally {
      setLoadingCustomer(false);
    }
  }

  function openQuickAddCustomer() {
    setQuickAddName(customerQuery);
    setQuickAddPhone("");
    setQuickAddError(null);
    setShowQuickAddCustomer(true);
  }

  async function handleQuickAddCustomer() {
    setQuickAddSubmitting(true);
    setQuickAddError(null);
    try {
      const result = await quickCreateCustomer(quickAddName, quickAddPhone);
      if ("error" in result) {
        setQuickAddError(result.error);
        return;
      }
      const newCustomer: CustomerOption = { id: result.id, name: result.name, phone: result.phone };
      setCustomerList((prev) => [...prev, newCustomer]);
      setShowQuickAddCustomer(false);
      await selectCustomer(newCustomer);
      setTimeout(() => productInputRef.current?.focus(), 0);
    } catch (e) {
      setQuickAddError(e instanceof Error ? e.message : "Failed to add customer");
    } finally {
      setQuickAddSubmitting(false);
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
      return [
        ...prev,
        { productId: p.id, name: p.name, unit: p.unit, qty: 1, rate, costPrice: p.costPrice, minSellingPrice: p.minSellingPrice },
      ];
    });
    setPendingFocusProductId(p.id);
  }

  function addReceiptLine() {
    setReceiptsTouched(true);
    setReceipts((prev) => [...prev, { key: nextReceiptKey.current++, mode: "cash", amount: 0 }]);
  }

  function updateReceiptLine(key: number, patch: Partial<ReceiptLine>) {
    setReceiptsTouched(true);
    setReceipts((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeReceiptLine(key: number) {
    setReceiptsTouched(true);
    setReceipts((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function updateLine(productId: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
  const total = subtotal - discountAmount;
  const hasBelowThresholdLine = lines.some((l) => l.rate < l.minSellingPrice);
  const needsOverride = hasBelowThresholdLine && userRole !== "admin";

  // The single default receipt line tracks the total by default (most sales
  // are paid in full on the spot) until the user deliberately edits it for a
  // partial-payment, split-tender, or fully-on-credit sale.
  useEffect(() => {
    if (!receiptsTouched) {
      setReceipts((prev) => [{ ...prev[0], amount: Math.max(0, total) }]);
    }
  }, [total, receiptsTouched]);

  const totalReceived = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const overReceived = totalReceived > total + 0.0001;

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
      const input = {
        customerId: customer.id,
        paymentMode,
        discountAmount,
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: l.rate })),
        receipts: receipts
          .filter((r) => r.amount > 0)
          .map((r) => ({ mode: r.mode, amount: r.amount })),
      };
      const override =
        needsOverride && overrideUsername && overridePassword
          ? { username: overrideUsername, password: overridePassword }
          : undefined;

      const result = await createInvoice(input, override);
      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      if ("pending" in result) {
        setPendingMessage(
          "One or more items are priced below cost or minimum margin, so this invoice needs admin approval before it's finalized. It won't appear as a sale until approved. Ask an admin to enter their password above to complete it immediately instead."
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

  async function handleSaveDraft() {
    if (!customer) {
      setError("Select a customer before saving a draft.");
      return;
    }
    setSavingDraft(true);
    setError(null);
    try {
      const result = await saveDraft(draftId, {
        customerId: customer.id,
        paymentMode,
        discountAmount,
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: l.rate })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDraftId(result.id);
      setDraftSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Customer
        </label>
        <input
          ref={customerInputRef}
          value={customerQuery}
          onChange={(e) => {
            setCustomerQuery(e.target.value);
            setCustomer(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customerMatches.length > 0) {
              e.preventDefault();
              selectCustomer(customerMatches[0]);
              setTimeout(() => productInputRef.current?.focus(), 0);
            }
          }}
          placeholder="Type customer name..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {customerQuery.trim() && !customer && !showQuickAddCustomer && (
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
            {customerMatches.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-500">No matching customers.</li>
            )}
            <li className="border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={openQuickAddCustomer}
                className="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                + Add new customer{customerQuery.trim() ? ` "${customerQuery.trim()}"` : ""}
              </button>
            </li>
          </ul>
        )}
        {showQuickAddCustomer && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Add new customer</p>
            <input
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              placeholder="Customer name"
              autoFocus
              className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              value={quickAddPhone}
              onChange={(e) => setQuickAddPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            {quickAddError && <p className="mb-2 text-xs text-red-600">{quickAddError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleQuickAddCustomer}
                disabled={quickAddSubmitting || !quickAddName.trim()}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
              >
                {quickAddSubmitting ? "Adding..." : "Create & select"}
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomer(false)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
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
          ref={productInputRef}
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && productMatches.length > 0) {
              e.preventDefault();
              addProduct(productMatches[0]);
            }
          }}
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
            <th className="py-2">Sr</th>
            <th className="py-2">Description</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Rate</th>
            <th className="py-2">Amount</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.productId} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 text-zinc-400">{i + 1}</td>
              <td className="py-2">{l.name}</td>
              <td className="py-2">
                <input
                  ref={(el) => {
                    qtyRefs.current[l.productId] = el;
                  }}
                  type="number"
                  step="0.01"
                  value={l.qty}
                  onChange={(e) => updateLine(l.productId, { qty: Number(e.target.value) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const rateEl = rateRefs.current[l.productId];
                      rateEl?.focus();
                      rateEl?.select();
                    }
                  }}
                  className="w-20 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </td>
              <td className="py-2">
                <input
                  ref={(el) => {
                    rateRefs.current[l.productId] = el;
                  }}
                  type="number"
                  step="0.01"
                  value={l.rate}
                  onChange={(e) => updateLine(l.productId, { rate: Number(e.target.value) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      productInputRef.current?.focus();
                    }
                  }}
                  className={`w-24 rounded-md border px-2 py-1 dark:bg-zinc-900 ${
                    l.rate < l.minSellingPrice
                      ? "border-red-400 text-red-600"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                />
                {l.rate < l.costPrice && <p className="text-xs text-red-500">below cost</p>}
                {l.rate >= l.costPrice && l.rate < l.minSellingPrice && (
                  <p className="text-xs text-amber-600">below minimum margin</p>
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
              <td colSpan={6} className="py-4 text-zinc-500">
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
            {SALE_PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {paymentModeLabels[m]}
              </option>
            ))}
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

      <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Payment / Receipt
          </h3>
          <button
            type="button"
            onClick={addReceiptLine}
            className="text-xs text-zinc-600 underline dark:text-zinc-400"
          >
            + Split payment
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {receipts.map((r) => (
            <div key={r.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Amount received now
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={r.amount}
                  onChange={(e) => updateReceiptLine(r.key, { amount: Number(e.target.value) })}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Received via</span>
                <select
                  value={r.mode}
                  onChange={(e) => updateReceiptLine(r.key, { mode: e.target.value as TenderMode })}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {tenderModes.map((m) => (
                    <option key={m} value={m}>
                      {paymentModeLabels[m]}
                    </option>
                  ))}
                </select>
              </label>
              {receipts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReceiptLine(r.key)}
                  className="h-fit rounded-md border border-zinc-300 px-3 py-2 text-xs text-red-600 dark:border-zinc-700"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {overReceived && (
          <p className="mt-2 text-xs text-red-600">
            Amount received ({totalReceived.toFixed(2)}) is more than the bill total — reduce a line
            before submitting.
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Balance remaining on this bill: {(total - totalReceived).toFixed(2)}
        </p>
      </div>

      {needsOverride && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h3 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            Admin authorization needed
          </h3>
          <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
            An item is priced below cost or minimum margin. Have an admin type their password here
            to complete this sale immediately, or leave blank to submit it for approval instead.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={overrideUsername}
              onChange={(e) => setOverrideUsername(e.target.value)}
              placeholder="Admin username"
              className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm dark:border-amber-700 dark:bg-zinc-900"
            />
            <input
              type="password"
              value={overridePassword}
              onChange={(e) => setOverridePassword(e.target.value)}
              placeholder="Admin password"
              className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm dark:border-amber-700 dark:bg-zinc-900"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-sm">
        <p>Subtotal: {subtotal.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Total: {total.toFixed(2)}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {pendingMessage && <p className="text-sm text-amber-600">{pendingMessage}</p>}
      {draftSavedAt && !pendingMessage && (
        <p className="text-sm text-emerald-600">Draft saved at {draftSavedAt.toLocaleTimeString()}.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !!pendingMessage}
          className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent dark:text-white"
        >
          {submitting ? "Saving..." : "Create invoice"}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft || submitting}
          className="w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          {savingDraft ? "Saving draft..." : "Save as draft"}
        </button>
      </div>
    </div>
  );
}
