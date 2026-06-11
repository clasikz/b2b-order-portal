// Layer 1: map messy CSV headers (different column NAMES) to canonical fields.
// Structural mess (pivoted matrices = Layer 2) is described in the architecture, not built.

import type { CanonicalField, ColumnMapping, MappingResult } from "./types";
import { REQUIRED_FIELDS, ALL_FIELDS } from "./types";

// Header synonyms per canonical field. Compared after normalization.
const SYNONYMS: Record<CanonicalField, string[]> = {
  teamSquad: ["teamsquad", "team", "squad", "agegroup", "teamname", "teamsagegroups", "group"],
  jerseyNumber: [
    "jerseynumber",
    "jerseyno",
    "jersey",
    "playernumber",
    "playerno",
    "number",
    "no",
    "num",
    "shirtnumber",
    "shirtno",
  ],
  playerName: ["name", "playername", "player", "nameinitials", "initials", "fullname"],
  size: ["size", "shirtsize", "jerseysize", "kitsize"],
  productSku: ["productsku", "sku", "product", "productcode", "code", "itemcode"],
  quantity: ["quantity", "qty", "qnty", "count", "numordered"],
  packGroup: ["packgroup", "pack", "packbox", "box", "kitbox", "bundle", "carton"],
};

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Auto-detect a mapping from the source headers. Unambiguous, deterministic.
export function detectMapping(headers: string[]): MappingResult {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const field of ALL_FIELDS) {
    const synonyms = SYNONYMS[field];
    const match = headers.find(
      (h) => !used.has(h) && synonyms.includes(normalizeHeader(h)),
    );
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  const unmatchedHeaders = headers.filter((h) => !used.has(h));
  const missingRequired = REQUIRED_FIELDS.filter((f) => !(f in mapping));

  return { mapping, unmatchedHeaders, missingRequired };
}
