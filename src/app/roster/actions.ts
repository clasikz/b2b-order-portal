"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAction, AuthError } from "@/lib/auth";
import { validateRoster } from "@/lib/roster/validation";
import { toEntryData } from "@/lib/roster/persist";
import { loadCatalog } from "@/lib/catalog";
import type { RosterRow } from "@/lib/roster/types";

export type SubmitResult = { error: string } | { orderId: string };

// Server-side submit. Re-validates the (possibly edited) rows, never trusts the client,
// then creates the order in Draft with roster entries, an unlocked design, and audit events.
export async function submitRoster(rows: RosterRow[]): Promise<SubmitResult> {
  let session;
  try {
    session = await requireAction("order:submit");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  if (!session.club) return { error: "Your account is not linked to a club." };
  if (rows.length === 0) return { error: "No rows to submit." };

  const validation = validateRoster(rows, await loadCatalog());
  if (!validation.allValid) {
    return { error: "Roster still has validation errors. Resolve them before submitting." };
  }

  const entries = toEntryData(rows);
  const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);

  const order = await prisma.order.create({
    data: {
      clubId: session.club.id,
      status: "DRAFT",
      totalQty,
      createdById: session.id,
      rosterEntries: { create: entries },
      designLock: { create: { state: "UNLOCKED" } },
      auditEvents: {
        create: [
          { actor: session.email, eventType: "ORDER_CREATED", toStatus: "DRAFT" },
          { actor: session.email, eventType: "ROSTER_VALIDATED", detail: { rows: rows.length } },
        ],
      },
    },
  });

  redirect(`/orders/${order.id}`);
}
