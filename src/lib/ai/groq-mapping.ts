import "server-only";
import { ALL_FIELDS, type CanonicalField, type ColumnMapping } from "@/lib/roster/types";

// AI-assisted column mapping via Groq (llama-3.3-70b-versatile). Given messy CSV headers and
// a sample row, ask the model which header maps to each canonical field. Returns a partial
// mapping using only real header strings. Never throws to the caller - on any problem it
// returns null so the upload falls back to deterministic auto-detect.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const FIELD_HINTS: Record<CanonicalField, string> = {
  teamSquad: "team / squad / age group",
  jerseyNumber: "player jersey or shirt number",
  playerName: "player name or initials",
  size: "garment size (e.g. M, L, Y8)",
  productSku: "product code / SKU",
  quantity: "quantity ordered",
  packGroup: "pack / box / bundle the item is grouped into for the warehouse",
};

export async function aiProposeMapping(
  headers: string[],
  sampleRow: Record<string, string> | undefined,
): Promise<ColumnMapping | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || headers.length === 0) return null;

  const fields = ALL_FIELDS.map((f) => `- ${f}: ${FIELD_HINTS[f]}`).join("\n");
  const prompt = [
    "You map messy spreadsheet column headers to canonical roster fields.",
    "Canonical fields:",
    fields,
    "",
    `CSV headers: ${JSON.stringify(headers)}`,
    sampleRow ? `Sample row: ${JSON.stringify(sampleRow)}` : "",
    "",
    'Return ONLY JSON like {"teamSquad":"<header>", ...}. Use exact header strings from the',
    "list. Include a field only if a header clearly matches. Omit fields with no match.",
  ].join("\n");

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You output only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
      // Don't hang the upload if Groq is slow.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const headerSet = new Set(headers);
    const mapping: ColumnMapping = {};
    for (const field of ALL_FIELDS) {
      const value = parsed[field];
      // Only accept values that are real headers.
      if (typeof value === "string" && headerSet.has(value)) {
        mapping[field] = value;
      }
    }
    return mapping;
  } catch {
    return null; // network/timeout/parse error -> fall back to auto-detect
  }
}
