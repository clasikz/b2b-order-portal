import { prisma } from "@/lib/prisma";

// System flags (demo): ERP maintenance + AI-assisted CSV mapping.
const KEYS = {
  erpMaintenance: "erp_maintenance",
  aiMapping: "ai_mapping",
} as const;

async function getFlag(key: string): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value === "true";
}

async function setFlag(key: string, on: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: String(on) },
    create: { key, value: String(on) },
  });
}

// ERP maintenance acts as a simple circuit breaker: when on, the worker fails fast.
export const isErpInMaintenance = () => getFlag(KEYS.erpMaintenance);
export const setErpMaintenance = (on: boolean) => setFlag(KEYS.erpMaintenance, on);

// AI-assist: when on (and a GROQ_API_KEY is set), upload mapping uses the LLM.
export const isAiMappingEnabled = () => getFlag(KEYS.aiMapping);
export const setAiMapping = (on: boolean) => setFlag(KEYS.aiMapping, on);
