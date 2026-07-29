"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { resolveApproval } from "@/lib/approvals";
import { logAudit } from "@/lib/audit";
import { performCreateInvoice, performVoidInvoice, type CreateInvoiceInput } from "@/lib/actions/invoices";

export type ResolveApprovalState = { error: string } | { success: true } | undefined;

export async function resolveApprovalAction(
  id: number,
  status: "approved" | "rejected",
  _state: ResolveApprovalState
): Promise<ResolveApprovalState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { error: "Admin approval required for this action" };
  }

  const resolved = await resolveApproval(id, status, user.id);

  // Approving a queued request executes the underlying action with the same
  // logic an admin would use directly, so a below-threshold sale approved
  // later is created identically to one an admin enters themselves. If the
  // underlying action fails now (e.g. stock ran out while this was pending),
  // the approval stays marked "approved" (the decision itself was valid) but
  // we surface the execution failure so the admin knows to follow up.
  if (status === "approved" && resolved) {
    let executionError: string | null = null;

    if (resolved.type === "invoice.create") {
      const result = await performCreateInvoice(resolved.requestedBy, resolved.payload as CreateInvoiceInput);
      if ("error" in result) executionError = result.error;
    } else if (resolved.type === "invoice.void") {
      const payload = resolved.payload as { invoiceId: number };
      const result = await performVoidInvoice(payload.invoiceId, user.id);
      if ("error" in result) executionError = result.error;
    }

    if (executionError) {
      await logAudit({
        actorId: user.id,
        action: "approval.execution_failed",
        entity: "approval_requests",
        entityId: id,
        after: { error: executionError },
      });
      revalidatePath("/dashboard/approvals");
      return { error: `Approved, but couldn't complete it: ${executionError}` };
    }
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/invoices");
  return { success: true };
}
