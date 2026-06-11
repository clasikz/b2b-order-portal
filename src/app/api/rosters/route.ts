import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAction, AuthError } from "@/lib/auth";
import { CleanCsvNormalizer } from "@/lib/roster/normalizer";
import { validateRoster } from "@/lib/roster/validation";
import { loadCatalog } from "@/lib/catalog";
import { isAiMappingEnabled } from "@/lib/settings";
import { aiProposeMapping } from "@/lib/ai/groq-mapping";
import { ALL_FIELDS, type ColumnMapping } from "@/lib/roster/types";

// POST /api/rosters - parse + validate a CSV roster (no persistence).
// Body: { csv: string, mapping?: ColumnMapping }
export async function POST(req: Request) {
  try {
    await requireAction("roster:upload");
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: { csv?: string; mapping?: ColumnMapping };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const csv = (body.csv ?? "").trim();
  if (!csv) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  const normalizer = new CleanCsvNormalizer();
  let { headers, mappingResult, rows } = normalizer.normalize(csv, body.mapping);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found in the file." }, { status: 400 });
  }

  // AI-assist: if enabled and auto-detect left gaps, ask Groq to fill the unmapped fields.
  let aiAssisted = false;
  const unmapped = ALL_FIELDS.filter((f) => !mappingResult.mapping[f]);
  if (unmapped.length > 0 && (await isAiMappingEnabled())) {
    const sample = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
    }).data[0];
    const ai = await aiProposeMapping(headers, sample);
    if (ai) {
      const fill: ColumnMapping = {};
      for (const f of unmapped) if (ai[f]) fill[f] = ai[f];
      if (Object.keys(fill).length > 0) {
        // User-supplied mapping still wins over AI suggestions.
        const merged = { ...fill, ...(body.mapping ?? {}) };
        const re = normalizer.normalize(csv, merged);
        ({ headers, mappingResult, rows } = re);
        aiAssisted = true;
      }
    }
  }

  const catalog = await loadCatalog();
  const validation = validateRoster(rows, catalog);

  return NextResponse.json({
    headers,
    mapping: mappingResult.mapping,
    missingRequired: mappingResult.missingRequired,
    unmatchedHeaders: mappingResult.unmatchedHeaders,
    catalog,
    aiAssisted,
    ...validation,
  });
}
