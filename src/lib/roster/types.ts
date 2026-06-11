// Canonical roster schema. Core (assessment spec): Name, Size, Team Squad, Jersey Number.
// Optional pricing fields (from the richer sample): Product SKU + Quantity, used to price the
// order against the catalogue. Jersey Number is required, Name is optional.

export type CanonicalField =
  | "teamSquad"
  | "jerseyNumber"
  | "playerName"
  | "size"
  | "productSku"
  | "quantity"
  | "packGroup";

export const REQUIRED_FIELDS: CanonicalField[] = ["teamSquad", "jerseyNumber", "size"];
export const OPTIONAL_FIELDS: CanonicalField[] = [
  "playerName",
  "productSku",
  "quantity",
  "packGroup",
];
export const ALL_FIELDS: CanonicalField[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// A row after column mapping, values still raw strings from the CSV.
export interface RosterRow {
  rowNumber: number; // 1-based, matches the source file for user-facing errors
  teamSquad: string;
  jerseyNumber: string;
  playerName: string;
  size: string;
  productSku: string;
  quantity: string;
  packGroup: string;
}

// Minimal catalogue view used by validation + pricing (keyed by SKU).
export type CatalogEntry = { name: string; size: string; active: boolean; unitPrice: number };
export type Catalog = Record<string, CatalogEntry>;

export interface ValidationError {
  field: CanonicalField | "row";
  message: string;
}

export interface ValidatedRow extends RosterRow {
  errors: ValidationError[];
}

export interface ValidationSummary {
  total: number;
  withErrors: number;
  valid: number;
}

export interface ValidationResult {
  rows: ValidatedRow[];
  summary: ValidationSummary;
  allValid: boolean;
}

// Maps a canonical field to the source CSV header it was matched to.
export type ColumnMapping = Partial<Record<CanonicalField, string>>;

export interface MappingResult {
  mapping: ColumnMapping;
  unmatchedHeaders: string[];
  missingRequired: CanonicalField[];
}
