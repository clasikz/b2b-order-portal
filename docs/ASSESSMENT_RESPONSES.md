# Assessment Responses

Copy each block into the matching field in the assessment form. Written to reflect what is
actually built (the 3 core features on a real Postgres DB) versus what is described (the
integrations the business does not own).

---

## Section 1 - Architecture & System Design

### System Decomposition

Next.js (App Router, TypeScript) full-stack app, one repo, on a real PostgreSQL database
(Supabase) via Prisma. Layered by domain rather than by tier:

- **Auth/RBAC** (`lib/auth.ts`, `lib/rbac.ts`, `middleware.ts`): cookie-backed mock session
  against a real `users` table; a pure permission matrix (`can(role, action)`); middleware
  gates pages, API routes self-guard and return JSON 401/403.
- **Roster module** (`lib/roster/*`): a pluggable `RosterNormalizer` (CleanCsvNormalizer
  built; pivoted/AI variants stubbed), Layer-1 column auto-mapping, and a pure `validateRoster`
  rules engine. Exposed via `POST /api/rosters` (validate) and the `submitRoster` server action
  (persist).
- **Design module** (`lib/design/*`): a pure `decideDesignAction` state-machine/immutability
  function and a `lock-service` that persists + audits. Exposed via `POST /api/design-lock`.
- **Order module** (`lib/orders/*`, server actions): status transitions, role-scoped dashboard
  query, draft editing.
- **ERP module** (`lib/erp/adapter.ts`): status mapping + payload builder + a `MockErpAdapter`
  (the integration seam).
- **Data model** (Prisma): `Club`, `User`, `Order`, `RosterEntry`, `DesignLock`, `AuditEvent`.

Flow: roster intake creates an `Order` (Draft) with `RosterEntry` rows and an unlocked
`DesignLock`; submit moves it to Pending Approval; the design lock moves it to Locked/Ready;
every transition writes an append-only `AuditEvent`. The dashboard reads orders scoped by role.

### ERP & Systems Integration Plan

The portal is the system of record for intake/approval; the legacy systems are integrated
through adapters behind a stable interface, so nothing in the core depends on their protocols.

- **Legacy ERP (sales orders):** on Design Lock, an event hands a mapped sales-order payload to
  an `ErpAdapter`. Delivery is **asynchronous and durable**: the order is never lost if the ERP
  is down. The intended payload is written to an **outbox** in the same transaction as the
  status change; a worker delivers it with **retry + exponential backoff & jitter**, a
  **circuit breaker** to stop hammering an ERP in maintenance, an **idempotency key** so retries
  never create duplicate ERP orders, and a **dead-letter** state for exhausted jobs. (In this
  MVP the adapter is a stub; the payload is previewable per order.)
- **MS Access PO system:** migrate POs to a shadow Postgres table synced nightly until a full
  cut-over, giving a single order id and restoring traceability between sales order and PO.
- **Accounting (Xero-style):** on dispatch/packed, an invoice event is emitted to the accounting
  adapter (GST-inclusive, 50% deposit), removing the manual re-keying step.
- **Warehouse:** reads only Locked/Ready orders, so it can never pick an outdated design.

Integration patterns used: adapter interface per external system, outbox + worker for
guaranteed delivery, event-on-transition, and batch sync for legacy data migration.

### Scalability Notes

- **Multi-tenancy:** add `org_id` scoping to every entity and enforce Postgres row-level
  security; the current role-scoped query (`ordersWhereForRole`) generalises to org + role.
- **Auth:** replace the mock cookie session with a real provider (e.g. Supabase Auth / OIDC),
  keeping the same `can(role, action)` matrix and server-side `requireAction` checks.
- **Throughput:** move ERP/accounting delivery to a real queue (e.g. pg-boss / SQS) with the
  worker pattern already described; the API layer stays stateless and scales horizontally.
- **Service boundaries:** the domain modules (Roster, Design, Orders, ERP) are already
  separated and could be split into services once teams grow, communicating over the same
  events.
- **Ingestion at scale:** the `RosterNormalizer` interface lets new client file formats be
  added as adapters (template, heuristic un-pivot, or AI-assisted) without touching core.

---

## Section 2 - API Design & Implementation

### Endpoints Implemented

- **`POST /api/rosters`** - parse + validate a CSV roster (no persistence).
  Body `{ csv: string, mapping?: ColumnMapping }`. Auto-detects messy headers, applies an
  optional manual mapping override, returns `{ headers, mapping, missingRequired,
  unmatchedHeaders, rows (each with per-field errors), summary, allValid }`.
  Auth: requires `roster:upload` (Club Manager). Errors: `401` unauthenticated, `403` wrong
  role, `400` empty file / no data rows.

- **`POST /api/design-lock`** - lock a design or request a revision.
  Body `{ orderId, action: "lock" | "request_revision", note? }`. Enforces the state machine
  and immutability via the pure `decideDesignAction`; returns `{ status, lockState }`.
  Errors: `401`, `403` (e.g. Club Manager cannot lock), `404` order not found, **`409` when the
  order is already locked or not in an actionable state**.

Mutations that change order state are also exposed as **server actions** (validated +
RBAC-checked server-side): `submitRoster` (create Draft), `submitForApproval`
(Draft → Pending Approval), `updateRosterDraft` (edit a Draft), `applyDesignAction`
(shared by the route).

Validation, state-change, and error handling: every endpoint/action re-validates on the
server (never trusts the client), checks RBAC server-side, and maps domain errors to HTTP
status codes via typed error classes (`AuthError`, `DesignActionError`).

### ERP Adaptation - adapting this API for legacy ERP & MS Access

`lib/erp/adapter.ts` defines an `ErpAdapter` interface; today a `MockErpAdapter` returns the
payload. To connect a real ERP:

- Implement a `LegacyErpAdapter` behind the same interface that translates our REST/payload
  calls to the ERP's protocol (e.g. SOAP envelopes), mapping our roster lines to the ERP's
  `item_code` schema. `buildErpPayload` already produces the legacy sales-order shape and maps
  our statuses to legacy statuses (`toErpStatus`).
- Delivery uses the **outbox + worker** pattern (retry/backoff/jitter, circuit breaker,
  idempotency key, dead-letter) so transactional safety holds even when the ERP is in
  maintenance: the order state change and the outbox write commit together; the worker
  delivers later and is safe to retry.
- **MS Access PO:** migrate to a shadow Postgres table synced nightly until cut-over so order
  ids reconcile across systems.

### Validation Logic Notes

Validation runs at **two levels with one shared rule set** (`lib/roster/validation.ts`), so the
frontend and API never drift:

- **Frontend (live):** the editable preview re-runs `validateRoster` on every keystroke, so
  row/field errors clear as you type and Submit stays disabled until clean.
- **API/server (authoritative):** `POST /api/rosters` and every submit/update action re-run the
  same `validateRoster` before persisting.

Rules: required **Size**; required **Jersey Number** except for coaches/staff (keyword on Team
Squad); Jersey Number must be a positive integer; **duplicate Jersey Number scoped per Team
Squad** (the same number in a different squad is allowed). Column mapping is a separate pure
pass (`detectMapping`) that reports unmatched headers + missing required fields for the manual
mapping step. Design-lock immutability is enforced at the API by a status check
(`decideDesignAction`) before any mutation.

---

## Section 3 - Frontend UI & Workflow Implementation

### Roster Upload UI

`/roster/new` (Club Manager only). Choose a CSV; it is sent to `POST /api/rosters`, which
auto-detects the columns. If a required column cannot be matched, a "map your columns" step
appears with a dropdown per missing field. The rows then render in an **editable preview
table** that validates live: rows/cells with problems are highlighted red, an issues column
explains each error, and a summary banner shows "N need attention" vs "All rows valid". You can
edit cells inline (errors clear as you type) and remove junk rows. The **Submit button is
disabled until every row is valid**; on submit the server re-validates and creates the order in
Draft. The same editor is reused to edit a saved Draft order.

### Design Lock Screen

A Design panel on the order page shows the mock garment artwork. For an Approver while the
order is Pending Approval, two actions are shown: **Request Revision** (amber, with an optional
note - keeps the order Pending and flags the design) and **Approve & Lock** (green - transitions
to Locked/Ready). After locking, the actions are replaced by a **"Locked ✓" badge with a
timestamp**, the panel becomes read-only, and the state is persisted and re-hydrated on reload.
Immutability is enforced at the API (`409`), not just hidden in the UI - a direct call to
`POST /api/design-lock` on a locked order is rejected. Non-Approvers see a read-only view.

### Order Summary Dashboard

The home page (`/`) is the dashboard: a table of Order, Club, Players, Total Qty, a
**color-coded status badge** (gray Draft / amber Pending / green Locked), and Updated time;
rows link to the order detail. Visibility is **role-scoped**: Club Managers see their club's
orders, Warehouse sees only Locked/Ready, Approvers see all. The dashboard is rendered per
request, so a Design Lock transition is reflected on the next view. Each order detail page also
carries the **audit timeline** (every transition with actor + timestamp) and an **ERP
integration preview** (the mapped legacy status + the exact sales-order JSON that would be sent).

---

## AI Tooling Disclosure

I used **Claude (via Claude Code)** as a pair-programming agent throughout: planning the phased
build, scaffolding the Next.js + Prisma project, generating component/route/test code, and
drafting documentation. I directed the work and owned the decisions - the stack choice, the
build-vs-describe scope boundary, the order state machine and immutability model, the coach
exemption rule, and the inline-editing UX. I reviewed all generated code and verified behaviour
with unit tests (validation, RBAC, the design-lock state machine, ERP mapping) and live API
checks (RBAC 401/403, the `409` immutability guard, nullable persistence) rather than accepting
output blindly. AI accelerated implementation and boilerplate; the architecture and business
logic are my own.
