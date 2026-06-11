import type { RosterRow } from "./types";

// Maps validated roster rows to Prisma RosterEntry create data.
// Jersey number is null for coaches/non-players with no number.
export function toEntryData(rows: RosterRow[]) {
  return rows.map((r) => ({
    teamSquad: r.teamSquad.trim(),
    jerseyNumber: r.jerseyNumber.trim() === "" ? null : Number(r.jerseyNumber),
    playerName: r.playerName.trim() || null,
    size: r.size.trim(),
    productSku: r.productSku.trim() || null,
    quantity: r.quantity.trim() === "" ? 1 : Number(r.quantity),
    packGroup: r.packGroup.trim() || null,
  }));
}
