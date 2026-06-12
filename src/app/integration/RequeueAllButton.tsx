"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import { Pending } from "@/components/Spinner";
import { requeueAllJobs } from "./actions";

// Sends every dead-lettered job back to the queue at once (PENDING, attempts reset). Does not
// process them — the admin clicks "Process queue" afterwards once the ERP is online.
export function RequeueAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, run] = useLoaderTransition();
  const [error, setError] = useState("");

  function requeueAll() {
    setError("");
    run(async () => {
      const res = await requeueAllJobs();
      if ("error" in res) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={requeueAll}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-canvas disabled:opacity-50"
      >
        {pending ? <Pending label="Requeuing…" /> : `Requeue all (${count})`}
      </button>
    </div>
  );
}
