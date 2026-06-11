import { describe, it, expect } from "vitest";
import { decideDesignAction } from "./lock-rules";

describe("decideDesignAction", () => {
  it("QA-09: Approve & Lock on a pending order locks it", () => {
    const d = decideDesignAction("PENDING_APPROVAL", "lock");
    expect(d).toEqual({ ok: true, nextStatus: "LOCKED_READY", nextLockState: "LOCKED" });
  });

  it("QA-13: Request Revision keeps it pending, flags the design", () => {
    const d = decideDesignAction("PENDING_APPROVAL", "request_revision");
    expect(d).toEqual({
      ok: true,
      nextStatus: "PENDING_APPROVAL",
      nextLockState: "REVISION_REQUESTED",
    });
  });

  it("QA-11: a locked order rejects further actions with 409", () => {
    expect(decideDesignAction("LOCKED_READY", "lock")).toMatchObject({ ok: false, status: 409 });
    expect(decideDesignAction("LOCKED_READY", "request_revision")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("rejects locking a draft (not yet submitted) with 409", () => {
    expect(decideDesignAction("DRAFT", "lock")).toMatchObject({ ok: false, status: 409 });
  });
});
