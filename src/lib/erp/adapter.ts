// ERP integration boundary. The adapter is a STUB: it builds the payload that *would* be
// sent to the legacy ERP and maps our statuses to legacy ERP statuses, but calls nothing
// real. The resilience story (queue + retry + circuit breaker + idempotency + outbox) is
// described in the architecture write-up, not run live.

import type { Club, Order, OrderStatus, RosterEntry } from "@prisma/client";
import { formatOrderNumber } from "@/lib/order-status";

// Our 3-state machine mapped onto legacy ERP order statuses (see order_statuses.json /
// mock_erp_payload_example.json in the assessment data).
export const ERP_STATUS_MAP: Record<OrderStatus, string> = {
  DRAFT: "Not Synced (Draft)",
  PENDING_APPROVAL: "Awaiting Design Approval",
  LOCKED_READY: "ERP Sync Pending",
  PACKED: "Packed / Invoiced",
};

export function toErpStatus(status: OrderStatus): string {
  return ERP_STATUS_MAP[status];
}

export interface ErpLine {
  sku: string;
  size: string;
  qty: number;
  notes: string;
}

export interface ErpPayload {
  external_order_ref: string;
  account_code: string;
  status: string;
  lines: ErpLine[];
  integration_notes: string;
}

export type OrderForErp = Order & { club: Club; rosterEntries: RosterEntry[] };

// Maps an order + roster to the legacy ERP sales-order payload shape. A real ERP would map
// to its own item_code schema; here SKU falls back to a teamwear placeholder.
export function buildErpPayload(order: OrderForErp): ErpPayload {
  const lines: ErpLine[] = order.rosterEntries.map((e) => ({
    sku: e.productSku ?? `TEAMWEAR-${e.size}`,
    size: e.size,
    qty: e.quantity,
    notes: [
      e.packGroup ? `Pack ${e.packGroup}` : null,
      e.teamSquad,
      e.jerseyNumber !== null ? `#${e.jerseyNumber}` : null,
      e.playerName,
    ]
      .filter(Boolean)
      .join(" "),
  }));

  return {
    external_order_ref: formatOrderNumber(order.orderNumber),
    account_code: order.club.id,
    status: toErpStatus(order.status),
    lines,
    integration_notes: "Mock payload only. No real ERP is called.",
  };
}

export interface ErpAdapter {
  readonly name: string;
  push(order: OrderForErp): Promise<{ pushed: boolean; payload: ErpPayload }>;
}

export class MockErpAdapter implements ErpAdapter {
  readonly name = "mock-erp";
  async push(order: OrderForErp) {
    // In production this would enqueue a durable job and let a worker deliver it with
    // retry + circuit breaker + idempotency. Here we just return the mapped payload.
    return { pushed: true, payload: buildErpPayload(order) };
  }
}
