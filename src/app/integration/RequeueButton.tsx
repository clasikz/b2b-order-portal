"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import { Pending } from "@/components/Spinner";
import { requeueJob } from "./actions";

// Sends a dead-lettered job back to the queue (PENDING, attempts reset). Does not process it —
// the admin clicks "Process queue" afterwards once the ERP is online.
export function RequeueButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, run] = useLoaderTransition();
  const [error, setError] = useState("");

  function requeue() {
    setError("");
    run(async () => {
      const res = await requeueJob(jobId);
      if ("error" in res) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={requeue}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-canvas disabled:opacity-50"
      >
        {pending ? <Pending label="Requeuing…" /> : "Requeue"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
