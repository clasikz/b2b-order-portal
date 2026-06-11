import { describe, it, expect } from "vitest";
import { toErpStatus, buildErpPayload, type OrderForErp } from "./adapter";

describe("ERP adapter mapping", () => {
  it("maps our statuses to legacy ERP statuses", () => {
    expect(toErpStatus("DRAFT")).toBe("Not Synced (Draft)");
    expect(toErpStatus("PENDING_APPROVAL")).toBe("Awaiting Design Approval");
    expect(toErpStatus("LOCKED_READY")).toBe("ERP Sync Pending");
  });

  it("builds an ERP payload from an order + roster", () => {
    const order = {
      id: "abcd1234efgh",
      status: "LOCKED_READY",
      club: { id: "club_taguig" },
      rosterEntries: [
        { productSku: null, size: "Y8", quantity: 1, teamSquad: "U12", jerseyNumber: 7, playerName: "A. Santos" },
        { productSku: null, size: "OSFA", quantity: 1, teamSquad: "Coaches", jerseyNumber: null, playerName: "Coach Smith" },
      ],
    } as unknown as OrderForErp;

    const payload = buildErpPayload(order);

    expect(payload.external_order_ref).toBe("B2B-ABCD1234");
    expect(payload.account_code).toBe("club_taguig");
    expect(payload.status).toBe("ERP Sync Pending");
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines[0].notes).toBe("U12 #7 A. Santos");
    expect(payload.lines[1].notes).toBe("Coaches Coach Smith"); // no number for coach
  });
});
