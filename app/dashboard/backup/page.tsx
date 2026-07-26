import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { RestoreBackupForm } from "@/components/RestoreBackupForm";

export default async function BackupPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const [lastExport] = await db
    .select({ at: auditLog.at })
    .from(auditLog)
    .where(eq(auditLog.action, "backup.export"))
    .orderBy(desc(auditLog.at))
    .limit(1);

  const daysSinceExport = lastExport
    ? Math.floor((Date.now() - lastExport.at.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const needsReminder = daysSinceExport === null || daysSinceExport >= 7;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Backup & Restore</h1>

      {needsReminder && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {lastExport
            ? `It's been ${daysSinceExport} days since your last backup export. Consider downloading a fresh one.`
            : "No backup has ever been exported. Consider downloading one now."}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Export</h2>
        <p className="mb-2 text-sm text-zinc-500">
          Downloads every table (customers, products, invoices, purchases, cash records, users —
          including login credentials) as one JSON file. Store it securely.
        </p>
        {lastExport && (
          <p className="mb-3 text-sm text-zinc-500">Last export: {lastExport.at.toLocaleString()}</p>
        )}
        <a
          href="/api/backup/export"
          className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Download backup
        </a>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Restore</h2>
        <p className="mb-2 text-sm text-zinc-500">
          <strong>This replaces all current data</strong> with the contents of the uploaded backup
          file. There is no undo — export a fresh backup first if you want to keep what&apos;s here now.
        </p>
        <RestoreBackupForm />
      </div>
    </div>
  );
}
