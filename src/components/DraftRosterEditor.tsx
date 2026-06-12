"use client";

import { useRef, useState } from "react";
import { RosterRowsEditor } from "./RosterRowsEditor";
import { Spinner } from "./Spinner";
import { updateRosterDraft } from "@/app/orders/actions";
import type { Catalog, RosterRow } from "@/lib/roster/types";

type ApiResult = {
  missingRequired: string[];
  catalog: Catalog;
  aiAssisted: boolean;
  rows: (RosterRow & { errors: unknown[] })[];
};

// Editable draft roster with a secondary "Replace from CSV" action. Replacing reuses the same
// upload -> auto-detect/AI map -> validate pipeline as the new-order page, loads the rows into
// the editor, and leaves saving to the existing "Save changes" button (nothing is persisted
// until then).
export function DraftRosterEditor({
  orderId,
  initialRows,
  catalog,
}: {
  orderId: string;
  initialRows: RosterRow[];
  catalog: Catalog;
}) {
  const [rows, setRows] = useState<RosterRow[]>(initialRows);
  const [seq, setSeq] = useState(0); // remounts the editor when rows are replaced
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;

    setError("");
    setNote("");
    setLoading(true);
    try {
      const csv = await file.text();
      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not read that file.");
        return;
      }
      const result = data as ApiResult;
      if (result.missingRequired.length > 0) {
        setError(
          "Some required columns couldn't be matched automatically. Use the Upload roster page to map them manually.",
        );
        return;
      }
      setRows(
        result.rows.map((r) => ({
          rowNumber: r.rowNumber,
          teamSquad: r.teamSquad,
          jerseyNumber: r.jerseyNumber,
          playerName: r.playerName,
          size: r.size,
          productSku: r.productSku ?? "",
          quantity: r.quantity ?? "",
          packGroup: r.packGroup ?? "",
        })),
      );
      setSeq((s) => s + 1);
      setNote(
        result.aiAssisted
          ? `Loaded ${result.rows.length} rows from ${file.name} (AI-assisted mapping). Review and click Save changes.`
          : `Loaded ${result.rows.length} rows from ${file.name}. Review and click Save changes.`,
      );
    } catch {
      setError("Could not read that file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFile}
      />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Roster <span className="font-normal text-muted">(editable while draft)</span>
        </h2>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Spinner /> Reading…
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 transition hover:opacity-70 disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              <path d="M12 15V4" />
              <path d="m8 8 4-4 4 4" />
            </svg>
            Replace roster
          </button>
        </div>
      </div>

      {note && <p className="text-xs text-primary-600">{note}</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <RosterRowsEditor
        key={seq}
        initialRows={rows}
        catalog={catalog}
        onSubmit={updateRosterDraft.bind(null, orderId)}
        submitLabel="Save changes"
      />
    </div>
  );
}
