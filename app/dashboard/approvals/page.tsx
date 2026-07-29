import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { listPendingApprovals } from "@/lib/approvals";
import { ApprovalActionButtons } from "@/components/ApprovalActionButtons";

export default async function ApprovalsPage() {
  const current = await getCurrentUser();
  if (current.role !== "admin") redirect("/dashboard");

  const pending = await listPendingApprovals();

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Approvals
      </h1>
      <p className="mb-4 text-sm text-zinc-500">
        Actions that require admin sign-off queue here: a salesman selling
        below cost or below minimum margin, or a salesman requesting to
        void/undo an invoice. Products, customer rates, and stock adjustments
        are admin-only screens already, so those never need a separate
        approval step.
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-zinc-500">No pending approvals.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((req) => (
            <li
              key={req.id}
              className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {req.type}
                </p>
                {req.reason && (
                  <p className="text-zinc-500">{req.reason}</p>
                )}
              </div>
              <ApprovalActionButtons requestId={req.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
