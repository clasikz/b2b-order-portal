import { prisma } from "@/lib/prisma";
import { buildErpPayload, type OrderForErp } from "./adapter";
import { isErpInMaintenance } from "@/lib/settings";
import { decideNextState, isJobDue } from "./queue-logic";

// Enqueue an ERP sync job for a locked order. Idempotent: the unique idempotencyKey
// (ERP:orderId) means a re-lock or retry never creates a duplicate ERP order.
export async function enqueueErpSync(order: OrderForErp, actor: string) {
  const idempotencyKey = `ERP:${order.id}`;
  const existing = await prisma.integrationJob.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  const job = await prisma.integrationJob.create({
    data: {
      orderId: order.id,
      target: "ERP",
      status: "PENDING",
      idempotencyKey,
      payload: buildErpPayload(order) as object,
    },
  });

  await prisma.auditEvent.create({
    data: { orderId: order.id, actor, eventType: "ERP_ENQUEUED" },
  });

  return job;
}

export interface ProcessSummary {
  processed: number;
  synced: number;
  failed: number;
  retried: number;
  skipped: number;
}

// Worker: process all due PENDING ERP jobs once. In production this runs on a timer / queue
// service; here it is triggered manually ("Process queue") or could be polled. The ERP
// "call" checks the maintenance flag (circuit breaker): if on, the attempt fails and the job
// retries with backoff until maxAttempts, then dead-letters.
export async function processErpQueue(now: Date = new Date()): Promise<ProcessSummary> {
  const jobs = await prisma.integrationJob.findMany({ where: { status: "PENDING" } });
  const summary: ProcessSummary = { processed: 0, synced: 0, failed: 0, retried: 0, skipped: 0 };

  const maintenance = await isErpInMaintenance();

  for (const job of jobs) {
    if (!isJobDue(job.nextRetryAt, now)) {
      summary.skipped++;
      continue;
    }

    summary.processed++;
    const attempts = job.attempts + 1;

    // The mock ERP "call": succeeds only when the ERP is online.
    const succeeded = !maintenance;
    const error = maintenance ? "ERP is in maintenance (503)" : null;
    const outcome = decideNextState(succeeded, attempts, job.maxAttempts, error, now);

    await prisma.integrationJob.update({
      where: { id: job.id },
      data: {
        attempts,
        status: outcome.status,
        lastError: outcome.lastError,
        nextRetryAt: outcome.nextRetryAt,
      },
    });

    if (outcome.status === "DONE") {
      summary.synced++;
      await prisma.auditEvent.create({
        data: { orderId: job.orderId, actor: "SYSTEM", eventType: "ERP_SYNCED" },
      });
    } else if (outcome.status === "FAILED") {
      summary.failed++;
      await prisma.auditEvent.create({
        data: {
          orderId: job.orderId,
          actor: "SYSTEM",
          eventType: "ERP_FAILED",
          detail: { error: outcome.lastError, attempts },
        },
      });
    } else {
      summary.retried++;
    }
  }

  return summary;
}
