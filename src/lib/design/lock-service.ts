import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { enqueueErpSync } from "@/lib/erp/queue";
import { notify } from "@/lib/notifications";
import { formatOrderNumber } from "@/lib/order-status";
import { decideDesignAction, type DesignAction } from "./lock-rules";

export class DesignActionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DesignActionError";
    this.status = status;
  }
}

// Applies a design action with full enforcement: permission, state-machine + immutability
// (via decideDesignAction), persistence, and audit. Shared by the API route and the UI.
export async function applyDesignAction(
  session: SessionUser,
  orderId: string,
  action: DesignAction,
  note?: string,
) {
  const permission = action === "lock" ? "design:lock" : "design:revision";
  if (!can(session.role, permission)) {
    throw new DesignActionError("Forbidden", 403);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new DesignActionError("Order not found", 404);

  const decision = decideDesignAction(order.status, action);
  if (!decision.ok) throw new DesignActionError(decision.message, decision.status);

  // Can't approve & lock a design that doesn't exist yet - the designer must upload a proof.
  if (action === "lock") {
    const proofs = await prisma.designAsset.count({
      where: { orderId, kind: "DESIGNER_PROOF" },
    });
    if (proofs === 0) {
      throw new DesignActionError("There is no design proof to approve yet.", 409);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: decision.nextStatus },
    });

    await tx.designLock.update({
      where: { orderId },
      data:
        action === "lock"
          ? { state: decision.nextLockState, lockedAt: new Date(), lockedById: session.id }
          : { state: decision.nextLockState, revisionNote: note ?? null },
    });

    await tx.auditEvent.create({
      data: {
        orderId,
        actor: session.email,
        eventType: action === "lock" ? "DESIGN_LOCKED" : "REVISION_REQUESTED",
        fromStatus: order.status,
        toStatus: decision.nextStatus,
        detail: note ? { note } : undefined,
      },
    });

    // An approval note travels to the conversation thread alongside the lock.
    const trimmed = note?.trim();
    if (trimmed) {
      await tx.designComment.create({
        data: {
          orderId,
          authorEmail: session.email,
          authorName: session.name,
          authorRole: session.role,
          body: trimmed,
        },
      });
    }
  });

  // On lock, enqueue the ERP sync (durable + idempotent). The order is safe even if the ERP
  // is in maintenance: the job waits in the queue and the worker retries it.
  if (action === "lock") {
    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { club: true, rosterEntries: true },
    });
    if (full) await enqueueErpSync(full, session.email);

    const ref = `#${formatOrderNumber(order.orderNumber)}`;
    // Warehouse: the order is ready for production.
    await notify({
      orderId,
      recipientRole: "WAREHOUSE",
      message: `Order ${ref} is approved & locked — ready for production.`,
    });
    // Designer: the client approved & locked the design.
    await notify({
      orderId,
      recipientRole: "DESIGNER",
      message: `Your design for order ${ref} was approved & locked by the client.`,
    });
  }

  return { status: decision.nextStatus, lockState: decision.nextLockState };
}
