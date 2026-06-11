"use client";

import { useState } from "react";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import { useRouter } from "next/navigation";
import { Pending } from "@/components/Spinner";

type Result = { error: string } | { ok: true };

export function SettingToggle({
  title,
  description,
  on,
  onLabel,
  offLabel,
  action,
  danger,
}: {
  title: string;
  description: string;
  on: boolean;
  onLabel: string; // shown when currently ON (the action turns it off)
  offLabel: string; // shown when currently OFF (the action turns it on)
  action: (next: boolean) => Promise<Result>;
  danger?: boolean; // ON state is a "warning" state (e.g. ERP down)
}) {
  const router = useRouter();
  const [pending, run] = useLoaderTransition();
  const [error, setError] = useState("");

  function toggle() {
    setError("");
    run(async () => {
      const res = await action(!on);
      if (res && "error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              on
                ? danger
                  ? "bg-red-50 text-red-600 ring-1 ring-red-200/70"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70"
            }`}
          >
            {on ? "On" : "Off"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
          on ? "bg-slate-600 hover:bg-slate-700" : "bg-primary hover:bg-primary-600"
        }`}
      >
        {pending ? <Pending label="Saving…" /> : on ? onLabel : offLabel}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
