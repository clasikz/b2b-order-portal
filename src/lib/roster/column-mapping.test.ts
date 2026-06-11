import { describe, it, expect } from "vitest";
import { detectMapping } from "./column-mapping";

describe("detectMapping (Layer 1 column auto-detection)", () => {
  it("QA-05: maps standard headers", () => {
    const { mapping, missingRequired } = detectMapping([
      "Team Squad",
      "Jersey Number",
      "Name",
      "Size",
    ]);
    expect(mapping.teamSquad).toBe("Team Squad");
    expect(mapping.jerseyNumber).toBe("Jersey Number");
    expect(mapping.playerName).toBe("Name");
    expect(mapping.size).toBe("Size");
    expect(missingRequired).toEqual([]);
  });

  it("QA-05: maps messy synonyms (Player No, Shirt Size, Team)", () => {
    const { mapping } = detectMapping(["Team", "Player No", "Name / Initials", "Shirt Size"]);
    expect(mapping.teamSquad).toBe("Team");
    expect(mapping.jerseyNumber).toBe("Player No");
    expect(mapping.playerName).toBe("Name / Initials");
    expect(mapping.size).toBe("Shirt Size");
  });

  it("QA-06: reports an unmatched header and the missing required field", () => {
    const { mapping, unmatchedHeaders, missingRequired } = detectMapping([
      "Squad",
      "Number",
      "Mystery Column",
    ]);
    expect(mapping.teamSquad).toBe("Squad");
    expect(mapping.jerseyNumber).toBe("Number");
    expect(unmatchedHeaders).toContain("Mystery Column");
    // No size column present -> flagged for the manual mapping step.
    expect(missingRequired).toContain("size");
  });
});
