"use client";

import { useState } from "react";
import { Pending } from "./Spinner";
import { useLoaderTransition } from "@/lib/use-loader-transition";

type Result = { error: string } | { ok: true } | { orderId: string } | void;

export function ActionButton({
  label,
  pendingLabel,
  action,
  className,
}: {
  label: string;
  pendingLabel?: string;
  action: () => Promise<Result>;
  className?: string;
}) {
  const [pending, run] = useLoaderTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(async () => {
            setError("");
            const result = await action();
            if (result && "error" in result) setError(result.error);
          })
        }
        className={
          className ??
          "w-fit rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:bg-slate-300"
        }
      >
        {pending ? <Pending label={pendingLabel ?? "Working…"} /> : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
