import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/order-status";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_BADGE[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
