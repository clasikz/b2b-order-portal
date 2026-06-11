// Pure design-lock decision logic. No DB, so the immutability + transition rules are fully
// unit-testable (QA-09, QA-11, QA-13).

import type { LockState, OrderStatus } from "@prisma/client";

export type DesignAction = "lock" | "request_revision";

export type DesignDecision =
  | { ok: true; nextStatus: OrderStatus; nextLockState: LockState }
  | { ok: false; status: number; message: string };

export function decideDesignAction(
  currentStatus: OrderStatus,
  action: DesignAction,
): DesignDecision {
  // Once locked, the order is immutable - no further design actions (QA-11).
  if (currentStatus === "LOCKED_READY") {
    return { ok: false, status: 409, message: "Order is locked and immutable." };
  }

  // Design actions are only valid while awaiting approval.
  if (currentStatus !== "PENDING_APPROVAL") {
    return {
      ok: false,
      status: 409,
      message: `Cannot ${action} an order in status ${currentStatus}.`,
    };
  }

  if (action === "lock") {
    return { ok: true, nextStatus: "LOCKED_READY", nextLockState: "LOCKED" };
  }

  // Request Revision keeps the order in Pending Approval, flags the design for changes.
  return { ok: true, nextStatus: "PENDING_APPROVAL", nextLockState: "REVISION_REQUESTED" };
}
