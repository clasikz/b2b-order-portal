import { prisma } from "@/lib/prisma";
import { buildErpPayload, type OrderForErp } from "./adapter";
import { isErpInMaintenance } from "@/lib/settings";
import { decideNextState, isJobDue } from "./queue-logic";
import { notify } from "@/lib/notifications";
import { formatOrderNumber } from "@/lib/order-status";

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
  // FIFO: process the oldest enqueued job first so syncs are fair and predictable.
  const jobs = await prisma.integrationJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
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
      // Dead-lettered: page the Super Admin so they can requeue it from the Integration page.
      const order = await prisma.order.findUnique({ where: { id: job.orderId } });
      if (order) {
        await notify({
          orderId: job.orderId,
          recipientRole: "SUPER_ADMIN",
          message: `ERP sync failed for order #${formatOrderNumber(order.orderNumber)} after ${attempts} attempts. Requeue it from the Integration page.`,
        });
      }
    } else {
      summary.retried++;
    }
  }

  return summary;
}

// Requeue a dead-lettered (FAILED) job: reset it to PENDING with a clean attempt count so the
// next "Process queue" picks it up. Does NOT process it here — the operator runs the queue
// explicitly once the ERP is back online.
export async function requeueErpJob(
  jobId: string,
  actor: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const job = await prisma.integrationJob.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found." };
  if (job.status !== "FAILED") {
    return { ok: false, error: "Only failed jobs can be requeued." };
  }

  await prisma.integrationJob.update({
    where: { id: jobId },
    data: { status: "PENDING", attempts: 0, lastError: null, nextRetryAt: null },
  });

  await prisma.auditEvent.create({
    data: { orderId: job.orderId, actor, eventType: "ERP_REQUEUED" },
  });

  return { ok: true };
}

// Requeue every dead-lettered job at once. A maintenance window usually fails many jobs
// together, so this is the common recovery action. Returns how many were requeued.
export async function requeueAllFailedErpJobs(actor: string): Promise<{ requeued: number }> {
  const failed = await prisma.integrationJob.findMany({
    where: { status: "FAILED" },
    select: { id: true, orderId: true },
  });
  if (failed.length === 0) return { requeued: 0 };

  await prisma.integrationJob.updateMany({
    where: { id: { in: failed.map((j) => j.id) } },
    data: { status: "PENDING", attempts: 0, lastError: null, nextRetryAt: null },
  });

  await prisma.auditEvent.createMany({
    data: failed.map((j) => ({
      orderId: j.orderId,
      actor,
      eventType: "ERP_REQUEUED" as const,
    })),
  });

  return { requeued: failed.length };
}
