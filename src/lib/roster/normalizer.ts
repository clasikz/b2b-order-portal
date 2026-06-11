// Pluggable roster ingestion. CleanCsvNormalizer is BUILT (Layer 1). The pivoted-Excel and
// AI-assisted variants are DESCRIBED in the architecture; they exist here as stubs so the
// extension point is real and visible in code.

import Papa from "papaparse";
import type { ColumnMapping, MappingResult, RosterRow } from "./types";
import { detectMapping } from "./column-mapping";

export interface NormalizeOutput {
  headers: string[];
  mappingResult: MappingResult;
  rows: RosterRow[];
}

export interface RosterNormalizer {
  readonly name: string;
  normalize(input: string, overrideMapping?: ColumnMapping): NormalizeOutput;
}

// Layer 1: flat CSV with possibly-renamed columns. Auto-detect mapping, or accept an
// override from the manual "map your columns" step.
export class CleanCsvNormalizer implements RosterNormalizer {
  readonly name = "clean-csv";

  normalize(input: string, overrideMapping?: ColumnMapping): NormalizeOutput {
    const parsed = Papa.parse<Record<string, string>>(input, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    const headers = parsed.meta.fields ?? [];
    const detected = detectMapping(headers);
    const mapping: ColumnMapping = { ...detected.mapping, ...overrideMapping };

    // Recompute the mapping report against the effective mapping.
    const mappingResult: MappingResult = {
      mapping,
      unmatchedHeaders: headers.filter((h) => !Object.values(mapping).includes(h)),
      missingRequired: (["teamSquad", "jerseyNumber", "size"] as const).filter(
        (f) => !mapping[f],
      ),
    };

    const get = (record: Record<string, string>, header?: string) =>
      header ? (record[header] ?? "").trim() : "";

    const rows: RosterRow[] = parsed.data.map((record, i) => ({
      rowNumber: i + 1,
      teamSquad: get(record, mapping.teamSquad),
      jerseyNumber: get(record, mapping.jerseyNumber),
      playerName: get(record, mapping.playerName),
      size: get(record, mapping.size),
      productSku: get(record, mapping.productSku),
      quantity: get(record, mapping.quantity),
      packGroup: get(record, mapping.packGroup),
    }));

    return { headers, mappingResult, rows };
  }
}

// --- Described-only stubs (Layer 2 / AI). See PROJECT_PLAN.md + architecture write-up. ---

export class PivotedExcelNormalizer implements RosterNormalizer {
  readonly name = "pivoted-excel";
  normalize(): NormalizeOutput {
    // Would detect size-header bands, un-pivot the matrix into rows, and reconcile against
    // the sheet's own TOTAL/grand-total checksums before a human-confirm step.
    throw new Error("PivotedExcelNormalizer is described in the architecture, not implemented.");
  }
}

export class AiAssistedNormalizer implements RosterNormalizer {
  readonly name = "ai-assisted";
  normalize(): NormalizeOutput {
    // Would send the sheet region + target schema to an LLM, then require the totals
    // checksum + human confirmation before import. Admin-toggled, org-level decision.
    throw new Error("AiAssistedNormalizer is described in the architecture, not implemented.");
  }
}
