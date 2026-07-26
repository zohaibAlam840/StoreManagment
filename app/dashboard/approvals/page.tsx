import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { listPendingApprovals } from "@/lib/approvals";
import { resolveApprovalAction } from "@/lib/actions/approvals";

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
              className="flex items-center justify-between rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {req.type}
                </p>
                {req.reason && (
                  <p className="text-zinc-500">{req.reason}</p>
                )}
              </div>
              <div className="flex gap-2">
                <form
                  action={resolveApprovalAction.bind(null, req.id, "approved")}
                >
                  <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-white">
                    Approve
                  </button>
                </form>
                <form
                  action={resolveApprovalAction.bind(null, req.id, "rejected")}
                >
                  <button className="rounded-md bg-red-600 px-3 py-1.5 text-white">
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
