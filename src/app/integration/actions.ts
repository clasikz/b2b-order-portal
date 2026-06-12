"use server";

import { revalidatePath } from "next/cache";
import { requireAction, AuthError } from "@/lib/auth";
import {
  processErpQueue,
  requeueErpJob,
  requeueAllFailedErpJobs,
  type ProcessSummary,
} from "@/lib/erp/queue";

export type IntegrationResult = { error: string } | ({ ok: true } & ProcessSummary);

export async function runErpQueue(): Promise<IntegrationResult> {
  try {
    await requireAction("integration:manage");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message } as IntegrationResult;
    throw e;
  }
  const summary = await processErpQueue();
  revalidatePath("/integration");
  return { ok: true, ...summary };
}

export type RequeueResult = { error: string } | { ok: true };

// Move a dead-lettered job back into the queue (PENDING, attempts reset). Does not run the
// queue — the admin clicks "Process queue" afterwards once the ERP is online.
export async function requeueJob(jobId: string): Promise<RequeueResult> {
  let session;
  try {
    session = await requireAction("integration:manage");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const res = await requeueErpJob(jobId, session!.email);
  if (!res.ok) return { error: res.error };
  revalidatePath("/integration");
  return { ok: true };
}

export type RequeueAllResult = { error: string } | { ok: true; requeued: number };

// Requeue all dead-lettered jobs in one click (the typical recovery after a maintenance window).
export async function requeueAllJobs(): Promise<RequeueAllResult> {
  let session;
  try {
    session = await requireAction("integration:manage");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const { requeued } = await requeueAllFailedErpJobs(session!.email);
  revalidatePath("/integration");
  return { ok: true, requeued };
}
