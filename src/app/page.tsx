import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ordersWhereForRole } from "@/lib/orders/queries";
import { AppShell } from "@/components/AppShell";
import { OrderRow } from "@/components/OrderRow";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: ordersWhereForRole(session.role, session.club?.id ?? null),
    include: { club: true, _count: { select: { rosterEntries: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const canDeleteDrafts = can(session.role, "order:submit");

  return (
    <AppShell title="Dashboard" user={session}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Orders</h2>
          <p className="text-sm text-muted">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        {can(session.role, "roster:upload") && (
          <Link
            href="/roster/new"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
          >
            + Upload roster
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center text-sm text-muted">
          No orders yet.
          {can(session.role, "roster:upload") && " Upload a roster to create one."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Club</th>
                <th className="px-5 py-3.5">Players</th>
                <th className="px-5 py-3.5">Total Qty</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Updated</th>
                {canDeleteDrafts && <th className="px-5 py-3.5"></th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  id={order.id}
                  orderNumber={order.orderNumber}
                  clubName={order.club.name}
                  players={order._count.rosterEntries}
                  totalQty={order.totalQty}
                  status={order.status}
                  updatedAt={order.updatedAt.toISOString()}
                  showDeleteColumn={canDeleteDrafts}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
