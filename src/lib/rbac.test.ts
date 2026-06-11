import { describe, it, expect } from "vitest";
import { can } from "./rbac";

describe("RBAC permission matrix", () => {
  it("Club Manager (client) uploads rosters and approves/locks designs", () => {
    expect(can("CLUB_MANAGER", "roster:upload")).toBe(true);
    expect(can("CLUB_MANAGER", "order:submit")).toBe(true);
    expect(can("CLUB_MANAGER", "design:lock")).toBe(true);
    expect(can("CLUB_MANAGER", "design:reference")).toBe(true);
  });

  it("Club Manager cannot upload a designer proof", () => {
    expect(can("CLUB_MANAGER", "design:proof")).toBe(false);
  });

  it("Designer uploads proofs and comments but cannot lock", () => {
    expect(can("DESIGNER", "design:proof")).toBe(true);
    expect(can("DESIGNER", "design:comment")).toBe(true);
    expect(can("DESIGNER", "design:lock")).toBe(false);
    expect(can("DESIGNER", "roster:upload")).toBe(false);
  });

  it("Warehouse can view and manage integration only", () => {
    expect(can("WAREHOUSE", "order:view")).toBe(true);
    expect(can("WAREHOUSE", "integration:manage")).toBe(true);
    expect(can("WAREHOUSE", "design:lock")).toBe(false);
    expect(can("WAREHOUSE", "roster:upload")).toBe(false);
  });
});
