"use client";

import { useState } from "react";
import { deleteDraftOrder } from "@/app/orders/actions";
import { Pending } from "./Spinner";
import { useLoaderTransition } from "@/lib/use-loader-transition";

export function DeleteDraftButton({
  orderId,
  compact = false,
}: {
  orderId: string;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, run] = useLoaderTransition();

  function doDelete() {
    setError("");
    run(async () => {
      const res = await deleteDraftOrder(orderId);
      if (res && "error" in res) setError(res.error);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={
          compact
            ? "rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
            : "rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        }
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!compact && <span className="text-sm text-muted">Delete this draft?</span>}
      <button
        type="button"
        disabled={pending}
        onClick={doDelete}
        className={
          compact
            ? "rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            : "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        }
      >
        {pending ? <Pending label="…" /> : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={
          compact
            ? "rounded-lg px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-canvas"
            : "rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-canvas"
        }
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
