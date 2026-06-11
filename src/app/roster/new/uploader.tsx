"use client";

import { useState } from "react";
import { RosterRowsEditor } from "@/components/RosterRowsEditor";
import { Spinner } from "@/components/Spinner";
import type { Catalog, RosterRow } from "@/lib/roster/types";
import { submitRoster } from "../actions";

type ApiResult = {
  headers: string[];
  mapping: Record<string, string>;
  missingRequired: string[];
  catalog: Catalog;
  aiAssisted: boolean;
  rows: (RosterRow & { errors: unknown[] })[];
};

const FIELD_LABELS: Record<string, string> = {
  teamSquad: "Team Squad",
  jerseyNumber: "Jersey Number",
  size: "Size",
};

export function RosterUploader() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Bumped on every upload/remap so the editor remounts with fresh rows even when a new file
  // happens to have the same column mapping as the previous one.
  const [seq, setSeq] = useState(0);

  async function validate(csvText: string, overrideMapping: Record<string, string>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, mapping: overrideMapping }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(null);
        setError(data.error ?? "Validation failed.");
        return;
      }
      setResult(data as ApiResult);
      // Bump the editor key together with the new result so it remounts with fresh rows,
      // even when the new file has the same columns as the previous one.
      setSeq((s) => s + 1);
    } catch {
      setError("Could not reach the validation service.");
    } finally {
      setLoading(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    setMapping({});
    await validate(text, {});
    // Allow re-selecting the same file name to re-trigger onChange.
    e.target.value = "";
  }

  function onRemap(field: string, header: string) {
    const next = { ...mapping, [field]: header };
    setMapping(next);
    void validate(csv, next);
  }

  // Strip server-side errors; the editor re-validates live as you edit.
  const initialRows: RosterRow[] = (result?.rows ?? []).map((r) => ({
    rowNumber: r.rowNumber,
    teamSquad: r.teamSquad,
    jerseyNumber: r.jerseyNumber,
    playerName: r.playerName,
    size: r.size,
    productSku: r.productSku ?? "",
    quantity: r.quantity ?? "",
    packGroup: r.packGroup ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-4 py-3 text-sm transition hover:border-primary/40 hover:bg-primary-50">
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        <span className="font-semibold text-ink">Choose CSV file</span>
        {fileName && <span className="text-muted">{fileName}</span>}
      </label>

      <p className="text-xs text-gray-500">
        Expected columns: Team Squad, Jersey Number, Name (optional), Size. Different column
        names are auto-detected; map any unmatched columns below. You can edit cells directly
        before submitting.
      </p>

      {loading && (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Spinner /> Validating…
        </p>
      )}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {result?.aiAssisted && (
        <p className="w-fit rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
          ✨ AI-assisted mapping applied
        </p>
      )}

      {result && result.missingRequired.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">Map the remaining columns</p>
          <div className="flex flex-col gap-2">
            {result.missingRequired.map((field) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <span className="w-28">{FIELD_LABELS[field] ?? field}</span>
                <select
                  className="rounded-lg border border-line bg-surface px-2 py-1"
                  value={mapping[field] ?? ""}
                  onChange={(e) => onRemap(field, e.target.value)}
                >
                  <option value="">Select a column…</option>
                  {result.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {result && (
        <RosterRowsEditor
          key={seq}
          initialRows={initialRows}
          catalog={result.catalog}
          onSubmit={(rows) => submitRoster(rows)}
          submitLabel="Submit roster"
          pendingLabel="Submitting…"
        />
      )}
    </div>
  );
}
