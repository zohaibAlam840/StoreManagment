"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { resolveApproval } from "@/lib/approvals";
import { performCreateInvoice, performVoidInvoice, type CreateInvoiceInput } from "@/lib/actions/invoices";

export async function resolveApprovalAction(id: number, status: "approved" | "rejected") {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Admin approval required for this action");
  }

  const resolved = await resolveApproval(id, status, user.id);

  // Approving a queued request executes the underlying action with the same
  // logic an admin would use directly, so a below-threshold sale approved
  // later is created identically to one an admin enters themselves.
  if (status === "approved" && resolved) {
    if (resolved.type === "invoice.create") {
      await performCreateInvoice(resolved.requestedBy, resolved.payload as CreateInvoiceInput);
    } else if (resolved.type === "invoice.void") {
      const payload = resolved.payload as { invoiceId: number };
      await performVoidInvoice(payload.invoiceId, user.id);
    }
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/invoices");
}
