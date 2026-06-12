"use client";

import { useState } from "react";

const VISIBLE_LIMIT = 10;

type Entry = {
  id: string;
  teamSquad: string;
  jerseyNumber: number | null;
  playerName: string | null;
  size: string;
  productSku: string | null;
  quantity: number;
  packGroup: string | null;
};

// Read-only roster table with a "show all" toggle so long rosters (e.g. 30+ players) don't
// dominate the order page.
export function RosterTable({ entries }: { entries: Entry[] }) {
  const [showAll, setShowAll] = useState(false);
  const hidden = Math.max(0, entries.length - VISIBLE_LIMIT);
  const visible = showAll ? entries : entries.slice(0, VISIBLE_LIMIT);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Team Squad</th>
              <th className="px-4 py-3">Jersey #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Pack Group</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr key={entry.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{entry.teamSquad}</td>
                <td className="px-4 py-3 text-muted">{entry.jerseyNumber ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{entry.playerName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{entry.size}</td>
                <td className="px-4 py-3 text-muted">{entry.productSku ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{entry.quantity}</td>
                <td className="px-4 py-3 text-muted">{entry.packGroup ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-xs font-medium text-primary-600 transition hover:opacity-70"
        >
          {showAll ? "Show fewer" : `Show all ${entries.length} rows`}
        </button>
      )}
    </div>
  );
}
