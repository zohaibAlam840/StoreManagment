import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { approvalRequests } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

// Generic gate used by every "admin approval required" action (requirement #10):
// below-cost sale, invoice edit/delete, cost edit, stock adjustment, rate
// reduction, etc. Callers create a request with whatever payload they need to
// re-run the action once approved, instead of each feature inventing its own
// pending-state flag.
export async function requestApproval(input: {
  type: string;
  payload: unknown;
  reason?: string;
  requestedBy: number;
}) {
  const [request] = await db
    .insert(approvalRequests)
    .values({
      type: input.type,
      payload: input.payload,
      reason: input.reason ?? null,
      requestedBy: input.requestedBy,
    })
    .returning();

  await logAudit({
    actorId: input.requestedBy,
    action: "approval.requested",
    entity: "approval_requests",
    entityId: request.id,
    after: request,
  });

  return request;
}

export async function resolveApproval(
  id: number,
  status: "approved" | "rejected",
  resolvedBy: number
) {
  const [before] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, id));

  const [after] = await db
    .update(approvalRequests)
    .set({ status, resolvedBy, resolvedAt: new Date() })
    .where(eq(approvalRequests.id, id))
    .returning();

  await logAudit({
    actorId: resolvedBy,
    action: `approval.${status}`,
    entity: "approval_requests",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function listPendingApprovals() {
  return db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.status, "pending"))
    .orderBy(approvalRequests.createdAt);
}
