"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAction, AuthError } from "@/lib/auth";
import { validateRoster } from "@/lib/roster/validation";
import { toEntryData } from "@/lib/roster/persist";
import { loadCatalog } from "@/lib/catalog";
import { notify } from "@/lib/notifications";
import type { RosterRow } from "@/lib/roster/types";

export type ActionResult = { error: string } | { ok: true };

// Draft -> Pending Approval. Club Manager submits a validated order for design approval.
export async function submitForApproval(orderId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAction("order:submit");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.clubId !== session.club?.id) return { error: "Not your club's order." };
  if (order.status !== "DRAFT") {
    return { error: `Cannot submit an order in status ${order.status}.` };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PENDING_APPROVAL",
      auditEvents: {
        create: {
          actor: session.email,
          eventType: "STATUS_CHANGED",
          fromStatus: "DRAFT",
          toStatus: "PENDING_APPROVAL",
        },
      },
    },
  });

  // Notify the design studio that a new order needs artwork.
  await notify({
    orderId,
    recipientRole: "DESIGNER",
    message: `New order ${orderId.slice(0, 8)} submitted — awaiting design.`,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Delete a Draft order. Only the owning Club Manager, only while Draft. Cascade removes
// roster entries, design lock, and audit events.
export async function deleteDraftOrder(orderId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAction("order:submit");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.clubId !== session.club?.id) return { error: "Not your club's order." };
  if (order.status !== "DRAFT") return { error: "Only draft orders can be deleted." };

  await prisma.order.delete({ where: { id: orderId } });
  redirect("/");
}

// Warehouse marks a Locked/Ready order as packed, which generates the mock Xero invoice
// event (README step 7). Idempotent on status.
export async function markPacked(orderId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAction("order:pack");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.status !== "LOCKED_READY") {
    return { error: "Only locked/ready orders can be packed." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PACKED",
      auditEvents: {
        create: [
          {
            actor: session.email,
            eventType: "ORDER_PACKED",
            fromStatus: "LOCKED_READY",
            toStatus: "PACKED",
          },
          { actor: "SYSTEM", eventType: "INVOICE_GENERATED", detail: { target: "Xero" } },
        ],
      },
    },
  });

  // Close the loop: tell the client (and the studio) the order is packed and invoiced.
  const short = orderId.slice(0, 8);
  await notify({
    orderId,
    recipientUserId: order.createdById,
    message: `Order ${short} has been packed and invoiced.`,
  });
  await notify({
    orderId,
    recipientRole: "DESIGNER",
    message: `Order ${short} has been packed and invoiced.`,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Edit a saved Draft order's roster. Only the owning Club Manager, only while Draft
// (locked/pending orders are immutable here). Re-validates before replacing entries.
export async function updateRosterDraft(
  orderId: string,
  rows: RosterRow[],
): Promise<ActionResult> {
  let session;
  try {
    session = await requireAction("order:submit");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.clubId !== session.club?.id) return { error: "Not your club's order." };
  if (order.status !== "DRAFT") {
    return { error: "Only draft orders can be edited." };
  }

  const validation = validateRoster(rows, await loadCatalog());
  if (!validation.allValid) {
    return { error: "Roster still has validation errors. Resolve them before saving." };
  }

  const entries = toEntryData(rows);
  const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);

  await prisma.$transaction(async (tx) => {
    await tx.rosterEntry.deleteMany({ where: { orderId } });
    await tx.order.update({
      where: { id: orderId },
      data: {
        totalQty,
        rosterEntries: { create: entries },
        auditEvents: {
          create: {
            actor: session!.email,
            eventType: "ROSTER_VALIDATED",
            detail: { edited: true, rows: rows.length },
          },
        },
      },
    });
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
