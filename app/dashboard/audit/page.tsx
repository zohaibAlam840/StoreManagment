import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const current = await getCurrentUser();
  if (current.role !== "admin") redirect("/dashboard");

  const entries = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      at: auditLog.at,
      actorName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .orderBy(desc(auditLog.at))
    .limit(100);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Audit Log
      </h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">When</th>
            <th className="py-2">Actor</th>
            <th className="py-2">Action</th>
            <th className="py-2">Entity</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{e.at.toLocaleString()}</td>
              <td className="py-2">{e.actorName ?? "—"}</td>
              <td className="py-2">{e.action}</td>
              <td className="py-2">
                {e.entity}
                {e.entityId ? ` #${e.entityId}` : ""}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-500">
                No activity recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
