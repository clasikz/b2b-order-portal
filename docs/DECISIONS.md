# Design Decisions & Things to Consider

The notable choices behind this build, the trade-offs taken, and what a production version
would change. Written so a reviewer can see the *why*, not just the *what*.

## Decisions & trade-offs

### Client is the approver; Designer is a distinct role
The assessment listed "Approver" as a role. Modelling the real workflow, the **client (Club
Manager) is the approver** who Approves & Locks, and a separate **Designer** produces the
artwork. This directly attacks pain point #3 (endless email approval threads) and removes a
confusing extra actor. Trade-off: a small, documented deviation from the literal role name.

### Lean state machine, mapped to the ERP
The portal runs **Draft → Pending Approval → Locked/Ready → Packed** and **maps** to the
legacy ERP's richer statuses through the adapter, rather than reimplementing all 12 ERP states
internally. Keeps the portal legible while preserving integration fidelity (see ARCHITECTURE).

### Immutability enforced at the API, not the UI
Once locked, mutations are rejected by `decideDesignAction` with a `409` — verified by hitting
the endpoint directly, not just by hiding buttons. This is the core guarantee that the
warehouse can't produce an outdated design.

### One shared validator, two layers
`validateRoster` is a pure function run **live in the editor** (instant feedback) and **again
on the server** before persisting. The two never drift because they're the same code.

### AI mapping is a gap-filler, not the default
Deterministic auto-detect runs first (free, instant). Groq is called **only for columns it
can't match**, and **only when an admin enables it**. Any error/timeout falls back to
auto-detect, so uploads never depend on the LLM. Efficient and safe.

### Durable queue over a naive ERP call
Locking enqueues an **idempotent** job; a worker delivers it with retry/backoff and a
circuit-breaker (the maintenance toggle). The order is never lost if the ERP is down and never
duplicated on retry — the resilience story the brief asks for, made real.

### Design proofs are versioned with confirm-before-save
Designers preview + explicitly confirm an upload (with an optional note posted to the thread),
so a wrong pick never becomes "v1". A new proof after a revision request flips the order back
to "in review".

### In-app notifications replace email
Email is out of scope, so every workflow handoff fires an in-app notification (bell + unread
count) to whoever acts next, targeted by **user** (this order's client) or **role** (any
designer / warehouse). Each notification is meaningful and actionable; purely internal steps
(e.g. ERP sync success) deliberately don't notify, to avoid noise. The badge updates on
navigation/refresh — true real-time push (polling/websockets) is the production upgrade.

### One progress bar for all waiting
A top progress bar (`nextjs-toploader`) runs for every async wait — link/route navigation
*and* server-action transitions — via a small `useLoaderTransition` hook, so the app always
signals "working" consistently rather than relying on scattered per-button spinners alone.

## Production roadmap (what I'd change next)

| Area | Demo | Production |
|------|------|-----------|
| **Auth** | mock cookie holding a user id | real provider (Supabase Auth / OIDC), signed/encrypted sessions, password hashing |
| **Image storage** | data URLs in Postgres (behind a storage seam) | Supabase Storage / S3, URLs only |
| **ERP/accounting** | adapters + previewable mock payloads | real adapters; outbox pattern; queue service (pg-boss/SQS) for the worker |
| **MS Access POs** | described | nightly shadow-table sync until cut-over, to reconcile order IDs |
| **Multi-tenancy** | single-tenant; role-scoped queries | `org_id` scoping + Postgres row-level security |
| **Messy ingestion** | clean-CSV + AI mapping | Layer-2 un-pivot for pivoted spreadsheets with totals reconciliation |
| **Pricing** | catalogue + tier + GST + deposit | freight, complex bulk-discount tiers, margin views |

## Things to consider (known gaps / talking points)

- **Mock garment**: the design panel is upload-driven (client reference + designer proofs)
  rather than shipping a static placeholder garment, so a brand-new order shows "awaiting
  design" empty states. This better reflects the real collaboration but diverges from a
  literal "show a mock design".
- **No mobile navigation**: the sidebar is hidden below `md` with no drawer yet — desktop-first.
- **Dev-only `/api/dev-login`**: a headless-test convenience that bypasses the login form; it
  returns 404 in production and must never ship enabled.
- **Auth is not secure by design** (mock) — see [SCOPE.md](./SCOPE.md). Intentional for a demo
  where free role-switching is the point.
