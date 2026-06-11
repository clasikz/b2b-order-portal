"use client";

import { useState } from "react";
import type { AuditEvent, AuditEventType } from "@prisma/client";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

const VISIBLE_LIMIT = 15;

const EVENT_LABEL: Record<AuditEventType, string> = {
  ORDER_CREATED: "Order created",
  ROSTER_VALIDATED: "Roster validated",
  STATUS_CHANGED: "Status changed",
  REFERENCE_UPLOADED: "Client reference uploaded",
  PROOF_UPLOADED: "Design proof uploaded",
  REVISION_REQUESTED: "Revision requested",
  DESIGN_LOCKED: "Design approved & locked",
  ERP_ENQUEUED: "ERP sync queued",
  ERP_SYNCED: "ERP synced",
  ERP_FAILED: "ERP sync failed",
  ORDER_PACKED: "Order packed",
  INVOICE_GENERATED: "Xero invoice generated",
};

function detailLine(event: AuditEvent): string | null {
  const detail = (event.detail ?? null) as
    | { note?: string; edited?: boolean; rows?: number; version?: number }
    | null;

  if (event.eventType === "STATUS_CHANGED" && event.fromStatus && event.toStatus) {
    return `${ORDER_STATUS_LABEL[event.fromStatus]} → ${ORDER_STATUS_LABEL[event.toStatus]}`;
  }
  if (event.eventType === "PROOF_UPLOADED" && typeof detail?.version === "number") {
    return detail.note ? `v${detail.version} — “${detail.note}”` : `v${detail.version}`;
  }
  if (event.eventType === "REVISION_REQUESTED" && detail?.note) {
    return `“${detail.note}”`;
  }
  if (event.eventType === "ROSTER_VALIDATED") {
    if (detail?.edited) return "Roster edited";
    if (typeof detail?.rows === "number") return `${detail.rows} rows`;
  }
  return null;
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const [showAll, setShowAll] = useState(false);

  if (events.length === 0) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }

  const hidden = Math.max(0, events.length - VISIBLE_LIMIT);
  const visible = showAll ? events : events.slice(-VISIBLE_LIMIT);

  return (
    <div className="flex flex-col gap-3">
      {hidden > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start text-xs font-medium text-primary-600 hover:underline"
        >
          Show {hidden} older event{hidden === 1 ? "" : "s"}
        </button>
      )}
      <ol className="flex flex-col gap-3">
        {visible.map((event) => {
          const sub = detailLine(event);
          return (
            <li key={event.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line" />
              <div>
                <p className="font-medium text-ink">{EVENT_LABEL[event.eventType]}</p>
                {sub && <p className="text-muted">{sub}</p>}
                <p className="text-xs text-muted">
                  {event.actor} · {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
