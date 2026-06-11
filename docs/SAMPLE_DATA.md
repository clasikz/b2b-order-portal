# Sample Roster Data

Ready-made CSVs for trying the upload/validation flow. Each uses real catalogue products and
includes a **Pack Group** column (used by the warehouse pick list). Canonical fields: Team
Squad, Jersey # (required; optional for coaches), Name (optional), Size, Product SKU, Qty,
Pack Group.

| File | Headers | What it exercises |
|---|---|---|
| `roster-auto-detect.csv` | Team, Player Name, Player No, SKU, Size, Qty, Pack Group | **Auto-detect** maps everything via synonyms. No AI, no manual step. |
| `roster-partial-headers.csv` | Team, Codename, Number, Catalogue Ref, Size, Qty, Box | **Gap-fill**: most auto-detect; Codename→Name and Catalogue Ref→SKU don't. AI fills the gaps (or manual). |
| `roster-messy-headers.csv` | Age Bracket, Member, Number Worn, Style Code, Garment Size, Order Count, Carton | Auto-detect matches **nothing**. AI maps all (or manual). |
| `ai-assist-test-roster.csv` | Roster Group, Athlete, Bib No, Catalogue Ref, Garment Fit, Units, Bundle | Same as above: full AI/manual mapping. |
| `roster-30-standard.csv` | clean headers | **30 rows**, 5 teams / 5 pack groups — happy path at scale (pick list, totals). |
| `roster-30-messy.csv` | messy headers | The same 30 rows with messy headers — AI mapping at scale. |
| `roster-invalid-data.csv` | standard headers | **Validation errors**: unknown SKU, duplicate jersey #, size/product mismatch, missing size, bad quantity, missing product. |

Also present: `sample_roster_upload.csv` and `sample_roster_upload_invalid.csv` (the original
assessment samples) and `example_jersey.jpg` (a design image to upload as a proof).

## How mapping behaves

1. **Auto-detect** runs first (synonym matching) — free, instant.
2. If anything is still unmapped **and AI-assist is enabled** (Super Admin → Settings, needs
   `GROQ_API_KEY`), Groq fills the gaps and the "✨ AI-assisted mapping applied" badge shows.
3. If AI is off or has no key, unmapped **required** fields prompt the manual mapping step.

See [AI_MAPPING.md](./AI_MAPPING.md) for the full mapping pipeline.

## Validation rules (exercised by `roster-invalid-data.csv`)

- Missing Size; Jersey # required (except coaches/staff); duplicate Jersey # within the same
  Team Squad.
- Product SKU must exist in the catalogue, be active, and match the row's size.
- If the order includes products/quantities at all, **every** row needs a valid product + qty.
