"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { voidInvoice } from "@/lib/actions/invoices";

export function InvoiceActions({
  invoiceId,
  status,
  customerPhone,
  whatsappText,
}: {
  invoiceId: number;
  status: string;
  customerPhone: string | null;
  whatsappText: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  function print() {
    window.print();
  }

  function shareOnWhatsapp() {
    const digits = (customerPhone ?? "").replace(/[^\d]/g, "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank");
  }

  async function handleVoid() {
    const reason = window.prompt("Reason for voiding/undoing this invoice?") ?? "";
    setWorking(true);
    try {
      const result = await voidInvoice(invoiceId, reason);
      if ("error" in result) {
        setMessage(result.error);
      } else if ("pending" in result) {
        setMessage("Void request sent for admin approval.");
      } else {
        setMessage("Invoice voided.");
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to void invoice");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="no-print mb-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={print}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Print
        </button>
        <button
          type="button"
          onClick={shareOnWhatsapp}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          title="Opens WhatsApp with a text summary pre-filled. Attach the printed/PDF copy manually — WhatsApp links can't attach files automatically."
        >
          Share on WhatsApp
        </button>
        {status === "posted" && (
          <Link
            href={`/dashboard/invoices/${invoiceId}/return`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Return items
          </Link>
        )}
        {status === "posted" && (
          <button
            type="button"
            onClick={handleVoid}
            disabled={working}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
          >
            Void / Undo
          </button>
        )}
        {status === "void" && (
          <span className="rounded-md bg-red-100 px-3 py-1.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Voided
          </span>
        )}
      </div>
      {message && <p className="text-sm text-zinc-500">{message}</p>}
    </div>
  );
}
