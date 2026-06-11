"use client";

import { useRef, useState } from "react";
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
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    setMapping({});
    await validate(text, {});
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    // Allow re-selecting the same file name to re-trigger onChange.
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /\.csv$/i.test(file.name)) void handleFile(file);
    else if (file) setError("Please drop a .csv file.");
  }

  function onRemap(field: string, header: string) {
    const next = { ...mapping, [field]: header };
    setMapping(next);
    void validate(csv, next);
  }

  // Download via a detached anchor so the top loader (which only hooks in-DOM anchors) doesn't
  // fire for a file download.
  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/roster-template.csv";
    a.download = "roster-template.csv";
    a.click();
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
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-6 text-center transition ${
          dragging ? "border-primary bg-primary-50" : "border-line bg-canvas"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onInputChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Choose a CSV file"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition hover:scale-105 hover:bg-primary/15 active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            <path d="M12 15V4" />
            <path d="m8 8 4-4 4 4" />
          </svg>
        </button>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-semibold text-primary-600 underline-offset-2 transition hover:underline"
          >
            Choose a CSV file
          </button>
          <span className="text-ink"> or drag it here</span>
        </div>

        {fileName ? (
          <p className="text-sm text-muted">{fileName}</p>
        ) : (
          <p className="text-xs text-muted">
            Columns are auto-detected; you can edit rows before submitting.
          </p>
        )}

        <button
          type="button"
          onClick={downloadTemplate}
          className="text-xs font-bold text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Download the CSV template
        </button>
      </div>

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
