import { describe, it, expect } from "vitest";
import { ordersWhereForRole, canViewOrder } from "./queries";

describe("ordersWhereForRole", () => {
  it("Club Manager is scoped to their own club", () => {
    expect(ordersWhereForRole("CLUB_MANAGER", "club_taguig")).toEqual({ clubId: "club_taguig" });
  });

  it("Designer sees submitted orders but NOT drafts", () => {
    expect(ordersWhereForRole("DESIGNER", null)).toEqual({ status: { not: "DRAFT" } });
  });

  it("Warehouse sees Locked/Ready and Packed orders", () => {
    expect(ordersWhereForRole("WAREHOUSE", null)).toEqual({
      status: { in: ["LOCKED_READY", "PACKED"] },
    });
  });

  it("Super Admin sees everything", () => {
    expect(ordersWhereForRole("SUPER_ADMIN", null)).toEqual({});
  });
});

describe("canViewOrder", () => {
  const draft = { clubId: "club_taguig", status: "DRAFT" as const };
  const pending = { clubId: "club_taguig", status: "PENDING_APPROVAL" as const };
  const locked = { clubId: "club_taguig", status: "LOCKED_READY" as const };

  it("a designer cannot open a draft, but can open a submitted order", () => {
    expect(canViewOrder("DESIGNER", null, draft)).toBe(false);
    expect(canViewOrder("DESIGNER", null, pending)).toBe(true);
  });

  it("a club manager only sees their own club's orders", () => {
    expect(canViewOrder("CLUB_MANAGER", "club_taguig", pending)).toBe(true);
    expect(canViewOrder("CLUB_MANAGER", "other_club", pending)).toBe(false);
  });

  it("warehouse only sees locked/ready", () => {
    expect(canViewOrder("WAREHOUSE", null, pending)).toBe(false);
    expect(canViewOrder("WAREHOUSE", null, locked)).toBe(true);
  });

  it("super admin sees any order", () => {
    expect(canViewOrder("SUPER_ADMIN", null, draft)).toBe(true);
  });
});
