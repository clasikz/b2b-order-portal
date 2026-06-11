import Link from "next/link";
import { redirect } from "next/navigation";
import type { IntegrationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isErpInMaintenance } from "@/lib/settings";
import { AppShell } from "@/components/AppShell";
import { IntegrationControls } from "./IntegrationControls";

const JOB_BADGE: Record<IntegrationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
  PROCESSING: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/70",
  DONE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
  FAILED: "bg-red-50 text-red-600 ring-1 ring-red-200/70",
};

export default async function IntegrationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "integration:manage")) {
    return (
      <AppShell title="Integration" user={session}>
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          Only Warehouse and Super Admin can operate integrations. You are signed in as{" "}
          {session.role}.
        </p>
      </AppShell>
    );
  }

  const [maintenance, jobs] = await Promise.all([
    isErpInMaintenance(),
    prisma.integrationJob.findMany({
      include: { order: { include: { club: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppShell title="Integration" user={session}>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <p className="text-sm text-muted">
          Outbound ERP sync queue. Locking an order enqueues a job. Toggle the ERP into
          maintenance to see jobs safely wait and retry; bring it back online and process the
          queue to see them sync. Retries use backoff and idempotency keys, so an order is
          never lost or duplicated.
        </p>

        <IntegrationControls
          maintenance={maintenance}
          canConfigure={can(session.role, "settings:manage")}
        />

        <section className="rounded-2xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Queue ({jobs.length})</h2>
          </div>
          {jobs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              No jobs yet. Approve &amp; lock an order to enqueue an ERP sync.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Club</th>
                    <th className="px-5 py-3">Target</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Attempts</th>
                    <th className="px-5 py-3">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/orders/${job.orderId}`}
                          className="font-semibold text-primary-600 hover:underline"
                        >
                          {job.orderId.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-ink">{job.order.club.name}</td>
                      <td className="px-5 py-3.5 text-muted">{job.target}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${JOB_BADGE[job.status]}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted">
                        {job.attempts}/{job.maxAttempts}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted">{job.lastError ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
