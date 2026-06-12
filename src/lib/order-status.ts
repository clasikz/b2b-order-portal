import type { OrderStatus } from "@prisma/client";

// Human-friendly order reference, e.g. B2B00000042. Prefix + 8-digit zero-padded sequence,
// so it reads like a standard transaction number.
export function formatOrderNumber(orderNumber: number): string {
  return `B2B${String(orderNumber).padStart(8, "0")}`;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  LOCKED_READY: "Locked / Ready for Production",
  PACKED: "Packed & Invoiced",
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
  LOCKED_READY: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
  PACKED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/70",
};
