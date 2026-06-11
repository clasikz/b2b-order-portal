import { describe, it, expect } from "vitest";
import { CleanCsvNormalizer } from "./normalizer";
import { validateRoster } from "./validation";

const normalizer = new CleanCsvNormalizer();

describe("CleanCsvNormalizer", () => {
  it("parses a messy-header CSV and maps to canonical rows", () => {
    const csv = [
      "Team,Player No,Name / Initials,Shirt Size",
      "U12,7,A. Santos,Y8",
      "U12,10,M. Lee,Y8",
    ].join("\n");

    const { rows, mappingResult } = normalizer.normalize(csv);

    expect(mappingResult.missingRequired).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rowNumber: 1,
      teamSquad: "U12",
      jerseyNumber: "7",
      playerName: "A. Santos",
      size: "Y8",
    });
    expect(validateRoster(rows).allValid).toBe(true);
  });

  it("honours an override mapping from the manual step", () => {
    const csv = ["Squad,Jersey ID,Kit Size", "U15,9,L"].join("\n");
    // "Jersey ID" is not a known synonym, so auto-detect misses it...
    expect(normalizer.normalize(csv).mappingResult.missingRequired).toContain("jerseyNumber");
    // ...until the user maps it manually.
    const { rows, mappingResult } = normalizer.normalize(csv, { jerseyNumber: "Jersey ID" });
    expect(mappingResult.missingRequired).toEqual([]);
    expect(rows[0]).toMatchObject({ teamSquad: "U15", jerseyNumber: "9", size: "L" });
  });
});
