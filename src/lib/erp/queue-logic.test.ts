import { describe, it, expect } from "vitest";
import { decideNextState, backoffMs, isJobDue } from "./queue-logic";

describe("ERP queue logic", () => {
  it("marks a job DONE on success", () => {
    expect(decideNextState(true, 1, 5, null)).toMatchObject({ status: "DONE" });
  });

  it("retries (PENDING) on failure with attempts remaining", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const out = decideNextState(false, 2, 5, "ERP in maintenance", now);
    expect(out.status).toBe("PENDING");
    expect(out.lastError).toBe("ERP in maintenance");
    expect((out as { nextRetryAt: Date }).nextRetryAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("dead-letters (FAILED) once maxAttempts is reached", () => {
    const out = decideNextState(false, 5, 5, "ERP in maintenance");
    expect(out.status).toBe("FAILED");
  });

  it("uses exponential backoff", () => {
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(3)).toBe(8000);
  });

  it("treats a job with no scheduled retry as due", () => {
    expect(isJobDue(null)).toBe(true);
  });

  it("respects a future retry time", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const future = new Date(now.getTime() + 5000);
    expect(isJobDue(future, now)).toBe(false);
  });
});
