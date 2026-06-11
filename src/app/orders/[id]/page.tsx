import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAction } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { AppShell } from "@/components/AppShell";
import { DesignPanel } from "@/components/DesignPanel";
import { DeleteDraftButton } from "@/components/DeleteDraftButton";
import { RosterRowsEditor } from "@/components/RosterRowsEditor";
import { AuditTimeline } from "@/components/AuditTimeline";
import { PickList } from "@/components/PickList";
import { RosterTable } from "@/components/RosterTable";
import type { RosterRow } from "@/lib/roster/types";
import { buildErpPayload, toErpStatus } from "@/lib/erp/adapter";
import { loadCatalog } from "@/lib/catalog";
import { canViewOrder } from "@/lib/orders/queries";
import { buildXeroInvoice, type PricedLine } from "@/lib/xero/invoice";
import { InvoicePanel } from "@/components/InvoicePanel";
import { submitForApproval, updateRosterDraft, markPacked } from "../actions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAction("order:view");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      club: true,
      rosterEntries: { orderBy: { id: "asc" } },
      designLock: true,
      designAssets: { orderBy: { createdAt: "desc" } },
      designComments: { orderBy: { createdAt: "asc" } },
      auditEvents: { orderBy: { createdAt: "asc" } },
      integrationJobs: { where: { target: "ERP" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();
  // Enforce per-order visibility for direct URL access (e.g. a designer can't open a draft).
  if (!canViewOrder(session.role, session.club?.id ?? null, order)) notFound();

  const erpPayload = buildErpPayload(order);
  const erpJob = order.integrationJobs[0] ?? null;

  // Price the order from the catalogue + the club's discount tier (mock Xero invoice).
  const catalog = await loadCatalog();
  const lineMap = new Map<string, PricedLine>();
  for (const e of order.rosterEntries) {
    const product = e.productSku ? catalog[e.productSku] : undefined;
    if (!e.productSku || !product) continue;
    const existing = lineMap.get(e.productSku);
    if (existing) existing.quantity += e.quantity;
    else
      lineMap.set(e.productSku, {
        sku: e.productSku,
        name: product.name,
        quantity: e.quantity,
        unitPrice: product.unitPrice,
      });
  }
  const pricedLines = [...lineMap.values()];
  const invoice =
    pricedLines.length > 0
      ? buildXeroInvoice({
          orderId: order.id,
          accountCode: order.club.id,
          accountName: order.club.name,
          discountPct: order.club.discountPct,
          requiresDeposit: order.club.requiresDeposit,
          lines: pricedLines,
        })
      : null;

  const reference =
    order.designAssets.find((a) => a.kind === "CLIENT_REFERENCE") ?? null;
  const proofs = order.designAssets.filter((a) => a.kind === "DESIGNER_PROOF");
  const toAsset = (a: (typeof order.designAssets)[number]) => ({
    id: a.id,
    storedRef: a.storedRef,
    uploaderName: a.uploaderName,
    createdAt: a.createdAt.toISOString(),
  });

  const isOwnerManager =
    can(session.role, "order:submit") && order.clubId === session.club?.id;
  const canSubmit = order.status === "DRAFT" && isOwnerManager;
  const canEditRoster = order.status === "DRAFT" && isOwnerManager;

  const rosterRows: RosterRow[] = order.rosterEntries.map((entry, i) => ({
    rowNumber: i + 1,
    teamSquad: entry.teamSquad,
    jerseyNumber: entry.jerseyNumber === null ? "" : String(entry.jerseyNumber),
    playerName: entry.playerName ?? "",
    size: entry.size,
    productSku: entry.productSku ?? "",
    quantity: String(entry.quantity),
    packGroup: entry.packGroup ?? "",
  }));

  return (
    <AppShell title={`Order ${order.id.slice(0, 8)}`} user={session}>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-muted hover:text-ink">
              ← Back to dashboard
            </Link>
            <p className="mt-1 text-sm text-muted">
              {order.club.name} · {order.totalQty} item{order.totalQty === 1 ? "" : "s"} ·{" "}
              {order.rosterEntries.length} players
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {canSubmit && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm text-muted">
              This order is a draft. Submit it for design approval.
            </p>
            <div className="flex items-center gap-2">
              <DeleteDraftButton orderId={order.id} />
              <ActionButton
                label="Submit"
                pendingLabel="Submitting…"
                action={submitForApproval.bind(null, order.id)}
              />
            </div>
          </div>
        )}

        <DesignPanel
          orderId={order.id}
          status={order.status}
          lockState={order.designLock?.state ?? "UNLOCKED"}
          lockedAt={order.designLock?.lockedAt ? order.designLock.lockedAt.toISOString() : null}
          reference={reference ? toAsset(reference) : null}
          proofs={proofs.map(toAsset)}
          comments={order.designComments.map((c) => ({
            id: c.id,
            authorName: c.authorName,
            authorRole: c.authorRole,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
          }))}
          role={{
            isClient: can(session.role, "design:lock") && order.clubId === session.club?.id,
            isDesigner: can(session.role, "design:proof"),
          }}
        />

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Roster{" "}
            {canEditRoster && (
              <span className="font-normal text-muted">(editable while draft)</span>
            )}
          </h2>
          {canEditRoster ? (
            <RosterRowsEditor
              initialRows={rosterRows}
              catalog={catalog}
              onSubmit={updateRosterDraft.bind(null, order.id)}
              submitLabel="Save changes"
            />
          ) : (
            <RosterTable entries={order.rosterEntries} />
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-ink">ERP integration</h2>
          <p className="text-sm text-muted">
            Legacy ERP status:{" "}
            <span className="font-semibold text-ink">{toErpStatus(order.status)}</span>
          </p>
          {erpJob && (
            <p className="mt-1 text-sm text-muted">
              Sync job:{" "}
              <span className="font-semibold text-ink">{erpJob.status}</span>
              {erpJob.attempts > 0 && ` · ${erpJob.attempts}/${erpJob.maxAttempts} attempts`}
              {erpJob.lastError && (
                <span className="text-red-600"> · {erpJob.lastError}</span>
              )}
            </p>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-medium text-primary-600">
              Preview ERP sales-order payload (mock, not sent)
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-canvas p-3 text-xs text-ink">
              {JSON.stringify(erpPayload, null, 2)}
            </pre>
          </details>
        </section>

        {(order.status === "LOCKED_READY" || order.status === "PACKED") && (
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Warehouse pick list</h2>
              {can(session.role, "order:pack") && order.status === "LOCKED_READY" && (
                <ActionButton
                  label="Mark as packed & invoice"
                  pendingLabel="Packing…"
                  action={markPacked.bind(null, order.id)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-300"
                />
              )}
              {order.status === "PACKED" && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/70">
                  Packed ✓
                </span>
              )}
            </div>
            <PickList entries={order.rosterEntries} />
          </section>
        )}

        <InvoicePanel
          invoice={invoice}
          locked={order.status === "LOCKED_READY" || order.status === "PACKED"}
          issued={order.status === "PACKED"}
        />

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-ink">Activity</h2>
          <AuditTimeline events={order.auditEvents} />
        </section>
      </div>
    </AppShell>
  );
}
