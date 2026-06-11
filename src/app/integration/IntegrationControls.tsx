"use client";

import { useState } from "react";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runErpQueue } from "./actions";
import { Pending } from "@/components/Spinner";

export function IntegrationControls({
  maintenance,
  canConfigure,
}: {
  maintenance: boolean;
  canConfigure: boolean;
}) {
  const router = useRouter();
  const [pending, run] = useLoaderTransition();
  const [msg, setMsg] = useState("");

  function process() {
    setMsg("");
    run(async () => {
      const res = await runErpQueue();
      if (res && "error" in res) {
        setMsg(res.error);
      } else if ("processed" in res) {
        setMsg(
          `Processed ${res.processed}: ${res.synced} synced, ${res.retried} retried, ${res.failed} failed${
            res.skipped ? `, ${res.skipped} waiting on backoff` : ""
          }.`,
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-ink">Legacy ERP</p>
          <p className="text-sm text-muted">
            Status:{" "}
            {maintenance ? (
              <span className="font-semibold text-red-600">In maintenance (down)</span>
            ) : (
              <span className="font-semibold text-emerald-600">Online</span>
            )}
          </p>
        </div>
        {canConfigure ? (
          <Link
            href="/settings"
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink"
          >
            Configure in Settings
          </Link>
        ) : (
          <span className="text-xs text-muted">Maintenance is toggled in Settings (admin).</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={process}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
        >
          {pending ? <Pending label="Processing…" /> : "Process queue"}
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>
    </div>
  );
}
