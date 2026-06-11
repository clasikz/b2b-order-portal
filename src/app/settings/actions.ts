"use server";

import { revalidatePath } from "next/cache";
import { requireAction, AuthError } from "@/lib/auth";
import { setErpMaintenance, setAiMapping } from "@/lib/settings";

export type SettingsResult = { error: string } | { ok: true };

async function guard(): Promise<SettingsResult | null> {
  try {
    await requireAction("settings:manage");
    return null;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

export async function toggleErpMaintenance(on: boolean): Promise<SettingsResult> {
  const denied = await guard();
  if (denied) return denied;
  await setErpMaintenance(on);
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleAiMapping(on: boolean): Promise<SettingsResult> {
  const denied = await guard();
  if (denied) return denied;
  await setAiMapping(on);
  revalidatePath("/settings");
  return { ok: true };
}
