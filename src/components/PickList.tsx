// Warehouse pick list grouped by pack group (README step 6). Falls back to Team Squad when a
// row has no pack group, and "Unassigned" if neither.
type Entry = {
  teamSquad: string;
  jerseyNumber: number | null;
  playerName: string | null;
  size: string;
  productSku: string | null;
  quantity: number;
  packGroup: string | null;
};

export function PickList({ entries }: { entries: Entry[] }) {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = e.packGroup?.trim() || e.teamSquad?.trim() || "Unassigned";
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([group, rows]) => {
        const total = rows.reduce((sum, r) => sum + r.quantity, 0);
        return (
          <div key={group} className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-2.5">
              <p className="text-sm font-semibold text-ink">{group}</p>
              <span className="text-xs text-muted">
                {rows.length} line{rows.length === 1 ? "" : "s"} · {total} item
                {total === 1 ? "" : "s"}
              </span>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Player</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-2 font-medium text-ink">{r.productSku ?? "—"}</td>
                    <td className="px-4 py-2 text-muted">{r.size}</td>
                    <td className="px-4 py-2 text-muted">{r.quantity}</td>
                    <td className="px-4 py-2 text-muted">
                      {[r.jerseyNumber !== null ? `#${r.jerseyNumber}` : null, r.playerName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
