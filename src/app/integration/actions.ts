"use server";

import { revalidatePath } from "next/cache";
import { requireAction, AuthError } from "@/lib/auth";
import { processErpQueue, type ProcessSummary } from "@/lib/erp/queue";

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
