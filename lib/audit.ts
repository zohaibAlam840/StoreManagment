import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

type LogAuditInput = {
  actorId: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
};

// Call this from every mutating Server Action/route so audit coverage is
// guaranteed rather than added ad hoc per feature (requirement #11).
export async function logAudit({
  actorId,
  action,
  entity,
  entityId,
  before,
  after,
}: LogAuditInput) {
  await db.insert(auditLog).values({
    actorId,
    action,
    entity,
    entityId: entityId === undefined || entityId === null ? null : String(entityId),
    before: before === undefined ? null : before,
    after: after === undefined ? null : after,
  });
}
