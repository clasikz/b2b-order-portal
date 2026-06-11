# Scope, Boundaries & Assumptions

What this build deliberately **is**, **isn't**, and the assumptions it rests on. The guiding
boundary: the **portal is the real, fully-built system of record**; everything the business
doesn't own (legacy ERP, MS Access POs, accounting) is **simulated behind an adapter** with a
written integration plan.

## Built (real, working)

- Auth + **RBAC** for 4 roles, enforced server-side (not just hidden UI).
- **Roster upload & validation**: CSV parsing, deterministic column auto-detect, optional
  Groq AI gap-fill, manual mapping fallback, inline editing, and a shared rules engine run on
  both client (live) and server (authoritative).
- **Catalogue-based pricing**: quote/invoice from real product prices × tier discount + GST +
  deposit.
- **Design collaboration**: client reference image, versioned designer proofs, comment
  thread, Request Revision / Approve & Lock with **API-enforced immutability** (`409`).
- **Order lifecycle**: Draft → Pending Approval → Locked/Ready → Packed, with a role-scoped
  dashboard and per-order audit timeline.
- **ERP integration (mock, but real mechanics)**: durable job queue, retry with backoff,
  circuit-breaker via a maintenance toggle, idempotency keys, dead-letter — operated from an
  Integration console.
- **Warehouse pick list** grouped by pack group; **mark-packed → mock Xero invoice** event.
- **In-app notifications** (bell + unread count) targeted by user or role, fired on every
  workflow handoff (submit, proof, comment, revision, lock, packed) — the email replacement.
- **Super Admin + Settings** (ERP-maintenance + AI-assist toggles).
- Real **PostgreSQL** (Supabase) persistence via Prisma.

## Described, not built (extension points exist in code)

- **Live ERP / MS Access PO / accounting connections** — adapters + integration plan; no real
  network calls. Payloads are previewable per order.
- **Layer-2 ingestion** (pivoted/matrix spreadsheets) — a `RosterNormalizer` interface with a
  described un-pivot + totals-reconciliation strategy; only the clean-CSV normalizer is built.
  (Per the client's email, a representative messy CSV stands in for the complex real sheet.)

## Out of scope (demo limitations)

- **Production auth** — sessions are a mock cookie holding a user id; no passwords, JWT, or
  refresh tokens (see [DECISIONS.md](./DECISIONS.md)).
- **Object storage** — design images are stored as data URLs behind a storage seam, not S3 /
  Supabase Storage.
- **Real email, payments, multi-tenancy isolation, freight/margin pricing, backorders** —
  described where relevant, not built. (In-app notifications stand in for email; they update
  on navigation/refresh, not live push — real-time would need polling or websockets.)
- **Hardening** (rate limiting, audit retention, perf tuning) — not in scope for the MVP.

## Key assumptions

- **Jersey Number required; Name optional** (per client) — except **coaches/staff**, who are
  exempt from the number rule (detected by keyword on Team Squad).
- **Product SKU + Quantity are optional**, but **required-when-present**: if any row carries a
  product/quantity, every row must. The pure 4-field roster (Name/Size/Team/Number) still works.
- **Pack Group is optional** — the pick list falls back to grouping by Team Squad.
- **Each client logs in as their own club**, which drives pricing and the ERP account code.
- **Pricing**: GST-inclusive at 10%; deposit standard at 50% for accounts that require one;
  prices come from the seeded product catalogue.
- The complex real Taguig spreadsheet is treated as a **described Layer-2 case**; representative
  messy CSVs in this folder cover the column-mapping path (client-authorized).
