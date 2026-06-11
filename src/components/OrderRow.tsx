"use client";

import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import type { OrderStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { DeleteDraftButton } from "./DeleteDraftButton";

export function OrderRow({
  id,
  clubName,
  players,
  totalQty,
  status,
  updatedAt,
  showDeleteColumn,
}: {
  id: string;
  clubName: string;
  players: number;
  totalQty: number;
  status: OrderStatus;
  updatedAt: string;
  showDeleteColumn: boolean;
}) {
  const router = useRouter();
  const loader = useTopLoader();

  return (
    <tr
      onClick={() => {
        loader.start();
        router.push(`/orders/${id}`);
      }}
      className="cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-canvas"
    >
      <td className="px-5 py-4 font-semibold text-primary-600">{id.slice(0, 8)}</td>
      <td className="px-5 py-4 font-medium text-ink">{clubName}</td>
      <td className="px-5 py-4 text-muted">{players}</td>
      <td className="px-5 py-4 text-muted">{totalQty}</td>
      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>
      <td className="px-5 py-4 text-muted">{new Date(updatedAt).toLocaleDateString()}</td>
      {showDeleteColumn && (
        // Stop propagation so delete/confirm/cancel clicks don't navigate.
        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          {status === "DRAFT" && <DeleteDraftButton orderId={id} compact />}
        </td>
      )}
    </tr>
  );
}
