# AI-Assisted Column Mapping

The hard part of "messy customer spreadsheets" is that every club names their columns
differently (`Player No`, `Bib #`, `Number Worn`, …). The portal maps those to its canonical
fields in three escalating stages, and the LLM is only ever the **fallback** for what the
cheap, deterministic path can't resolve.

## The mapping pipeline

```
Upload CSV
  │
  ▼
1. Auto-detect (deterministic)   ── synonym matching on headers. Free, instant.
  │
  ├── all required fields mapped ─────────────────────────► done
  │
  ▼ (gaps remain)
2. AI gap-fill (Groq, if enabled) ── LLM maps ONLY the unmatched columns.
  │
  ├── success ──► "✨ AI-assisted mapping applied" badge ──► done
  │
  ▼ (AI off / no key / error)
3. Manual mapping step ──────────── user picks the column from a dropdown.
```

The user's manual choices always win over AI suggestions, which win over auto-detect.

## Why gap-fill, not "always AI"

- **Cost & latency** — most uploads are fully handled by step 1, so no LLM call is made.
- **Determinism** — the predictable path stays in control; AI only touches the residue.
- **Safety** — if Groq errors or times out, the upload silently falls back; it never depends
  on the model being available.

## How it works (implementation)

`src/lib/ai/groq-mapping.ts`:

- **Model**: `llama-3.3-70b-versatile` via Groq's OpenAI-compatible endpoint.
- **Input**: the CSV headers + one sample row + the list of canonical fields with hints.
- **Output**: JSON (`response_format: json_object`, `temperature: 0`) mapping each field to an
  **exact header string**.
- **Guard rails**: returned values are accepted only if they're real headers from the file;
  anything else is dropped. An 8-second `AbortSignal.timeout` caps latency. **Any** failure
  (no key, network, bad JSON) returns `null` → fall back to auto-detect/manual.

The upload route (`/api/rosters`) runs auto-detect first, then calls the mapper only for the
fields still unmapped, re-normalizes with the merged mapping, and returns an `aiAssisted` flag
that drives the UI badge.

## Enabling it

1. Get a free key at [console.groq.com](https://console.groq.com) and set `GROQ_API_KEY` in
   `.env`.
2. Sign in as **Super Admin → Settings → enable AI-assisted column mapping** (a persisted
   `SystemSetting` flag).

Without a key, the toggle is a no-op and uploads use auto-detect + manual mapping. The
Settings page says as much.

## Try it

Upload `docs/roster-messy-headers.csv` or `docs/ai-assist-test-roster.csv` (headers
auto-detect can't match). With AI **on** you'll see the "AI-assisted mapping applied" badge;
with it **off**, the manual mapping step appears instead.

## Production considerations

- **Privacy** — roster rows are customer data. This demo sends headers + a single sample row;
  a production version should send **headers only** (no row data), or run mapping fully
  server-side under a data-processing agreement, and make the feature opt-in per tenant.
- **Confidence + review** — surface AI-proposed mappings for explicit user confirmation on
  novel files rather than auto-applying (the manual step already supports this).
- **Caching** — remember a club's confirmed mapping so repeat uploads skip the LLM entirely.
- **Layer 2** — column *renaming* is what AI solves here; structurally different sheets
  (pivoted matrices) need the described un-pivot path, not mapping. See [SCOPE.md](./SCOPE.md).
