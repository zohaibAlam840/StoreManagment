"use client";

import { useActionState } from "react";
import { resolveApprovalAction } from "@/lib/actions/approvals";

export function ApprovalActionButtons({ requestId }: { requestId: number }) {
  const [approveState, approveAction, approvePending] = useActionState(
    resolveApprovalAction.bind(null, requestId, "approved"),
    undefined
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    resolveApprovalAction.bind(null, requestId, "rejected"),
    undefined
  );

  const error =
    (approveState && "error" in approveState && approveState.error) ||
    (rejectState && "error" in rejectState && rejectState.error) ||
    null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={approveAction}>
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-50"
          >
            {approvePending ? "Approving..." : "Approve"}
          </button>
        </form>
        <form action={rejectAction}>
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-white disabled:opacity-50"
          >
            {rejectPending ? "Rejecting..." : "Reject"}
          </button>
        </form>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
