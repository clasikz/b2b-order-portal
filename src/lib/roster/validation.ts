// Roster validation engine. Pure + DB-free so it is fully unit-testable (QA-01..QA-08).
// Headline rules (assessment): flag missing Size; flag duplicate Jersey Number within the
// same Team Squad. Plus required-field presence (Jersey Number, Team Squad) and that the
// number is a positive integer. Player Name is optional.

import type {
  Catalog,
  RosterRow,
  ValidatedRow,
  ValidationError,
  ValidationResult,
} from "./types";

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

// Non-players (coaches/staff) are exempt from the "jersey number required" rule.
// Detected by keyword on the Team Squad. Documented as an assumption in the README.
const NON_PLAYER_KEYWORDS = ["coach", "staff", "official", "manager", "management"];

export function isNonPlayer(teamSquad: string): boolean {
  const s = teamSquad.toLowerCase();
  return NON_PLAYER_KEYWORDS.some((k) => s.includes(k));
}

function parseJerseyNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n > 0 ? n : null;
}

// Key used to scope duplicate detection PER Team Squad (not globally).
function squadKey(teamSquad: string, jerseyNumber: number): string {
  return `${teamSquad.trim().toLowerCase()}::${jerseyNumber}`;
}

// `catalog` is optional: when provided (and a row has a product SKU) we validate the SKU
// against the catalogue. Without it, the core roster rules still apply (backward compatible).
export function validateRoster(rows: RosterRow[], catalog?: Catalog): ValidationResult {
  // First pass: per-row field checks.
  const errorsByRow = new Map<number, ValidationError[]>();
  const add = (rowNumber: number, error: ValidationError) => {
    const list = errorsByRow.get(rowNumber) ?? [];
    list.push(error);
    errorsByRow.set(rowNumber, list);
  };

  // If the order includes products/quantities at all (any row has one), then EVERY row must
  // have one - you can't order an item with no product or no quantity. The pure 4-field
  // roster (no product/quantity anywhere) stays unaffected.
  const productOrder = rows.some((r) => !isBlank(r.productSku));
  const quantityOrder = rows.some((r) => !isBlank(r.quantity));

  // Track squad+number occurrences for duplicate detection.
  const seen = new Map<string, number[]>(); // key -> rowNumbers

  for (const row of rows) {
    if (isBlank(row.teamSquad)) {
      add(row.rowNumber, { field: "teamSquad", message: "Missing team squad" });
    }
    if (isBlank(row.size)) {
      add(row.rowNumber, { field: "size", message: "Missing size" });
    }

    const number = parseJerseyNumber(row.jerseyNumber);
    if (isBlank(row.jerseyNumber)) {
      // Coaches/staff are allowed to have no number; players are not.
      if (!isNonPlayer(row.teamSquad)) {
        add(row.rowNumber, { field: "jerseyNumber", message: "Missing jersey number" });
      }
    } else if (number === null) {
      add(row.rowNumber, {
        field: "jerseyNumber",
        message: "Jersey number must be a positive whole number",
      });
    }

    // Quantity: required when this is a quantity order; if present, must be a positive int.
    if (isBlank(row.quantity)) {
      if (quantityOrder) {
        add(row.rowNumber, { field: "quantity", message: "Missing quantity" });
      }
    } else if (parseJerseyNumber(row.quantity) === null) {
      add(row.rowNumber, { field: "quantity", message: "Quantity must be a positive whole number" });
    }

    // Product SKU: required when this is a product order; if present, validate against catalogue.
    if (isBlank(row.productSku)) {
      if (productOrder) {
        add(row.rowNumber, { field: "productSku", message: "Missing product SKU" });
      }
    } else {
      const product = catalog?.[row.productSku.trim()];
      if (catalog && !product) {
        add(row.rowNumber, { field: "productSku", message: "Unknown product SKU" });
      } else if (product && !product.active) {
        add(row.rowNumber, { field: "productSku", message: "Product is discontinued" });
      } else if (product && !isBlank(row.size) && product.size !== row.size.trim()) {
        add(row.rowNumber, { field: "size", message: "Size does not match the product" });
      }
    }

    // Only consider well-formed rows for duplicate scoping.
    if (!isBlank(row.teamSquad) && number !== null) {
      const key = squadKey(row.teamSquad, number);
      const list = seen.get(key) ?? [];
      list.push(row.rowNumber);
      seen.set(key, list);
    }
  }

  // Second pass: flag duplicates (same number within the same squad).
  for (const rowNumbers of seen.values()) {
    if (rowNumbers.length > 1) {
      for (const rowNumber of rowNumbers) {
        add(rowNumber, {
          field: "jerseyNumber",
          message: "Duplicate jersey number in this team squad",
        });
      }
    }
  }

  const validated: ValidatedRow[] = rows.map((row) => ({
    ...row,
    errors: errorsByRow.get(row.rowNumber) ?? [],
  }));

  const withErrors = validated.filter((r) => r.errors.length > 0).length;

  return {
    rows: validated,
    summary: {
      total: validated.length,
      withErrors,
      valid: validated.length - withErrors,
    },
    allValid: withErrors === 0,
  };
}
