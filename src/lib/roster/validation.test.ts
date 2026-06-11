import { describe, it, expect } from "vitest";
import { validateRoster } from "./validation";
import type { RosterRow } from "./types";

function row(
  rowNumber: number,
  teamSquad: string,
  jerseyNumber: string,
  size: string,
  playerName = "",
  productSku = "",
  quantity = "",
  packGroup = "",
): RosterRow {
  return { rowNumber, teamSquad, jerseyNumber, playerName, size, productSku, quantity, packGroup };
}

function fieldsWithErrors(result: ReturnType<typeof validateRoster>, rowNumber: number) {
  return result.rows.find((r) => r.rowNumber === rowNumber)!.errors.map((e) => e.message);
}

describe("validateRoster", () => {
  it("QA-01: a clean roster is all valid", () => {
    const result = validateRoster([
      row(1, "U12", "7", "Y8", "A. Santos"),
      row(2, "U12", "10", "Y8", "M. Lee"),
    ]);
    expect(result.allValid).toBe(true);
    expect(result.summary).toEqual({ total: 2, withErrors: 0, valid: 2 });
  });

  it("QA-02: flags a missing size", () => {
    const result = validateRoster([row(1, "U12", "7", "")]);
    expect(result.allValid).toBe(false);
    expect(fieldsWithErrors(result, 1)).toContain("Missing size");
  });

  it("QA-03: flags duplicate jersey numbers within the same squad", () => {
    const result = validateRoster([
      row(1, "U12", "7", "Y8"),
      row(2, "U12", "7", "Y8"),
    ]);
    expect(fieldsWithErrors(result, 1)).toContain("Duplicate jersey number in this team squad");
    expect(fieldsWithErrors(result, 2)).toContain("Duplicate jersey number in this team squad");
  });

  it("QA-04: same jersey number in different squads is NOT a duplicate", () => {
    const result = validateRoster([
      row(1, "U12", "7", "Y8"),
      row(2, "U14", "7", "M"),
    ]);
    expect(result.allValid).toBe(true);
  });

  it("QA-08: player name is optional", () => {
    const result = validateRoster([row(1, "U12", "7", "Y8", "")]);
    expect(result.allValid).toBe(true);
  });

  it("flags a missing jersey number for a player (required)", () => {
    const result = validateRoster([row(1, "U12", "", "Y8")]);
    expect(fieldsWithErrors(result, 1)).toContain("Missing jersey number");
  });

  it("exempts coaches/staff from the jersey number requirement", () => {
    const result = validateRoster([
      row(1, "Coaches", "", "OSFA", "Coach Smith"),
      row(2, "Team Staff", "", "M", "Physio"),
    ]);
    expect(result.allValid).toBe(true);
  });

  it("still requires size for a coach", () => {
    const result = validateRoster([row(1, "Coaches", "", "", "Coach Smith")]);
    expect(fieldsWithErrors(result, 1)).toContain("Missing size");
  });

  it("flags a non-numeric jersey number", () => {
    const result = validateRoster([row(1, "U12", "abc", "Y8")]);
    expect(fieldsWithErrors(result, 1)).toContain(
      "Jersey number must be a positive whole number",
    );
  });
});

describe("validateRoster - catalogue / pricing fields", () => {
  const catalog = {
    "STK-JER-NAVY-Y8": { name: "Jersey", size: "Y8", active: true, unitPrice: 38 },
    "OLD-SKU": { name: "Old", size: "M", active: false, unitPrice: 10 },
  };

  it("accepts a valid product SKU that matches the size", () => {
    const result = validateRoster([row(1, "U12", "7", "Y8", "", "STK-JER-NAVY-Y8", "1")], catalog);
    expect(result.allValid).toBe(true);
  });

  it("flags an unknown product SKU", () => {
    const result = validateRoster([row(1, "U12", "7", "Y8", "", "BAD-SKU")], catalog);
    expect(fieldsWithErrors(result, 1)).toContain("Unknown product SKU");
  });

  it("flags a discontinued product", () => {
    const result = validateRoster([row(1, "U12", "7", "M", "", "OLD-SKU")], catalog);
    expect(fieldsWithErrors(result, 1)).toContain("Product is discontinued");
  });

  it("flags a size that does not match the product", () => {
    const result = validateRoster([row(1, "U12", "7", "XXXL", "", "STK-JER-NAVY-Y8")], catalog);
    expect(fieldsWithErrors(result, 1)).toContain("Size does not match the product");
  });

  it("flags a non-positive quantity", () => {
    const result = validateRoster([row(1, "U12", "7", "Y8", "", "", "zero")], catalog);
    expect(fieldsWithErrors(result, 1)).toContain("Quantity must be a positive whole number");
  });

  it("skips SKU checks when no catalogue is supplied", () => {
    const result = validateRoster([row(1, "U12", "7", "Y8", "", "ANYTHING")]);
    expect(result.allValid).toBe(true);
  });

  it("requires a product SKU on every row once any row has one", () => {
    const result = validateRoster(
      [
        row(1, "U12", "7", "Y8", "", "STK-JER-NAVY-Y8", "1"),
        row(2, "U12", "10", "Y8", "", "", "1"), // missing SKU in a product order
      ],
      catalog,
    );
    expect(fieldsWithErrors(result, 2)).toContain("Missing product SKU");
  });

  it("requires a quantity on every row once any row has one", () => {
    const result = validateRoster([
      row(1, "U12", "7", "Y8", "", "", "2"),
      row(2, "U12", "10", "Y8", "", "", ""), // missing quantity in a quantity order
    ]);
    expect(fieldsWithErrors(result, 2)).toContain("Missing quantity");
  });

  it("the pure 4-field roster (no product/quantity anywhere) needs neither", () => {
    const result = validateRoster([
      row(1, "U12", "7", "Y8"),
      row(2, "U12", "10", "M"),
    ]);
    expect(result.allValid).toBe(true);
  });
});
