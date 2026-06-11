"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { validateRoster } from "@/lib/roster/validation";
import { Pending } from "./Spinner";
import { TrashIcon } from "./icons/TrashIcon";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import type { Catalog, CanonicalField, RosterRow } from "@/lib/roster/types";

type SubmitResult = { error: string } | { ok: true } | { orderId: string } | void;

const FIELDS: { key: CanonicalField; label: string; width: string }[] = [
  { key: "teamSquad", label: "Team Squad", width: "w-36" },
  { key: "jerseyNumber", label: "Jersey #", width: "w-20" },
  { key: "playerName", label: "Name", width: "w-36" },
  { key: "size", label: "Size", width: "w-20" },
  { key: "productSku", label: "Product SKU", width: "w-44" },
  { key: "quantity", label: "Qty", width: "w-16" },
  { key: "packGroup", label: "Pack Group", width: "w-36" },
];

export function RosterRowsEditor({
  initialRows,
  catalog,
  onSubmit,
  submitLabel,
  pendingLabel = "Saving…",
}: {
  initialRows: RosterRow[];
  catalog?: Catalog;
  onSubmit: (rows: RosterRow[]) => Promise<SubmitResult>;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const [rows, setRows] = useState<RosterRow[]>(initialRows);
  const [error, setError] = useState("");
  const [pending, run] = useLoaderTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live, client-side validation using the SAME rules the server enforces on submit.
  const validation = useMemo(() => validateRoster(rows, catalog), [rows, catalog]);
  const errorsByRow = useMemo(
    () => new Map(validation.rows.map((r) => [r.rowNumber, r.errors])),
    [validation],
  );

  // Reveal the Issues column (far right) the first time errors appear, so they aren't hidden
  // off-screen behind the wider table.
  const hasErrors = validation.summary.withErrors > 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (hasErrors && typeof el?.scrollTo === "function") {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }
  }, [hasErrors]);

  function updateCell(rowNumber: number, field: CanonicalField, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.rowNumber === rowNumber ? { ...r, [field]: value } : r)),
    );
  }

  function removeRow(rowNumber: number) {
    setRows((prev) => prev.filter((r) => r.rowNumber !== rowNumber));
  }

  function submit() {
    setError("");
    run(async () => {
      const res = await onSubmit(rows);
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">{validation.summary.total} rows</span>
        {validation.summary.withErrors > 0 ? (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-red-600 ring-1 ring-red-200/70">
            {validation.summary.withErrors} need attention
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 ring-1 ring-emerald-200/70">
            All rows valid
          </span>
        )}
      </div>

      <div className="flex items-start gap-1">
        {/* Scrollable table */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto rounded-xl border border-line text-sm"
        >
          <div className="min-w-max">
            <div className="flex h-9 items-center border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">
              <div className="w-10 shrink-0 px-3">#</div>
              {FIELDS.map((f) => (
                <div key={f.key} className={`${f.width} shrink-0 px-2`}>
                  {f.label}
                </div>
              ))}
              <div className="w-48 shrink-0 px-3">Issues</div>
            </div>
            {rows.map((row) => {
              const errs = errorsByRow.get(row.rowNumber) ?? [];
              const badFields = new Set(errs.map((e) => e.field));
              const issueText = errs.map((e) => e.message).join("; ");
              return (
                <div
                  key={row.rowNumber}
                  className={`flex h-11 items-center border-b border-line/70 last:border-0 ${errs.length ? "bg-red-50/40" : ""}`}
                >
                  <div className="w-10 shrink-0 px-3 text-gray-400">{row.rowNumber}</div>
                  {FIELDS.map((f) => (
                    <div key={f.key} className={`${f.width} shrink-0 px-2`}>
                      <input
                        value={row[f.key]}
                        onChange={(e) => updateCell(row.rowNumber, f.key, e.target.value)}
                        className={`w-full rounded-lg border px-2 py-1 focus:outline-none ${
                          badFields.has(f.key)
                            ? "border-red-300 bg-red-50"
                            : "border-line focus:border-primary/40"
                        }`}
                      />
                    </div>
                  ))}
                  <div
                    className="w-48 shrink-0 px-3 text-xs text-red-600"
                    title={issueText}
                  >
                    {issueText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delete buttons: a borderless column OUTSIDE the scroll area, always visible.
            Matches the table's header (h-9) + row (h-11) heights to stay aligned. */}
        <div className="shrink-0">
          <div className="h-9" />
          {rows.map((row) => (
            <div key={row.rowNumber} className="flex h-11 items-center justify-center">
              <button
                type="button"
                onClick={() => removeRow(row.rowNumber)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove row ${row.rowNumber}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={!validation.allValid || rows.length === 0 || pending}
        onClick={submit}
        className="w-fit rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {pending ? <Pending label={pendingLabel} /> : submitLabel}
      </button>
    </div>
  );
}
