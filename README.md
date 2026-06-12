# B2B Order Intake & Approval Portal

![CI](https://github.com/clasikz/b2b-order-portal/actions/workflows/ci.yml/badge.svg)

A lightweight portal that replaces the Excel-and-email mess for a B2B sportswear brand:
club managers upload a team roster, it's validated and priced, a designer and the client
collaborate on the artwork, the client approves & **locks** it, and the order flows through
ERP sync, warehouse pick/pack, and a mock invoice, with a full audit trail throughout.

Built for the Senior Full-Stack architecture assessment. Systems the business doesn't own
(legacy ERP, MS Access POs, accounting) are integration-ready **adapters/stubs** with a
written integration plan rather than live calls.

## Tech stack

- **Next.js** (App Router, TypeScript) — UI + API (Route Handlers + Server Actions)
- **PostgreSQL (Supabase) + Prisma** — real persistence, simulating production
- **Tailwind CSS** — UI · **Vitest + Testing Library** — tests
- **Groq (llama-3.3-70b)** — optional AI-assisted CSV column mapping
- Mock cookie-session auth with server-enforced RBAC

## What it does

1. **Roster upload & validation** — CSV upload with auto-detect → AI → manual column
   mapping, live + server validation (missing size, duplicate jersey # within a squad, coach
   exemption, catalogue product/size checks), inline editing.
2. **Design collaboration & lock** — client reference image, versioned designer proofs, a
   comment thread, and Request Revision / **Approve & Lock**. Locked orders are immutable
   (API returns `409`).
3. **Order dashboard & lifecycle** — role-scoped dashboard following the state machine, with
   pricing/quote, mock ERP sync (durable queue + retry + circuit breaker), warehouse pick
   list grouped by pack group, mark-packed → mock Xero invoice, and an audit log.

Every handoff fires an **in-app notification** (bell + unread count) to whoever acts next —
replacing the email back-and-forth, since email is out of scope.

## Order state machine

```
Draft ──submit──► Pending Approval ──approve & lock──► Locked / Ready ──pack──► Packed & Invoiced
                       │
                       └── request revision ──► (stays Pending; designer re-uploads)
```

Once **Locked**, the order is immutable: the warehouse only ever produces the approved
design, and the locked state maps to the legacy ERP "ERP Sync Pending" status. See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the full mapping.

## Roles (RBAC, enforced server-side)

| Role | Can |
|------|-----|
| **Club Manager** (client) | upload/edit/submit rosters, comment, approve & lock, view own club's orders |
| **Designer** | upload design proofs, comment, view submitted orders (not drafts) |
| **Warehouse** | view production-ready orders, pick/pack |
| **Super Admin** | see everything; operate the ERP sync queue (process, requeue dead-lettered jobs); manage ERP-maintenance + AI-assist settings |

## Quick start

```bash
npm install
# set DATABASE_URL + DIRECT_URL (Supabase) in .env — see .env.example
# optional: GROQ_API_KEY to enable AI-assisted mapping
npx prisma db push      # create tables
npm run db:seed         # products, accounts, demo users
npm run dev             # http://localhost:3000
```

**Demo sign-in** (mock auth, no passwords): pick an account on `/login`.
Clients show their discount tier (Northside Gold 15% · West Valley/Taguig Silver 10% ·
South Coast Bronze 5%); plus Designer, Warehouse, and Super Admin.

Sample rosters to try live in [`docs/`](./docs) (clean, messy-header, AI-mapping, invalid,
and 30-row files).

### Scripts

- `npm run dev` — dev server
- `npm run test` / `npm run test:run` — unit tests (Vitest)
- `npm run test:e2e` — end-to-end tests (Playwright)
- `npm run db:push` / `npm run db:seed` — schema + seed data

## Documentation

| Doc | What's inside |
|-----|----------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System decomposition, diagrams, ERP/state-machine mapping |
| [docs/SCOPE.md](./docs/SCOPE.md) | Scope, boundaries, what's built vs described, assumptions |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Key design decisions, trade-offs, production roadmap |
| [docs/AI_MAPPING.md](./docs/AI_MAPPING.md) | The AI-assisted CSV column-mapping feature in depth |
| [docs/TESTING.md](./docs/TESTING.md) | QA scenarios + automated-test coverage + how to run |
| [docs/SAMPLE_DATA.md](./docs/SAMPLE_DATA.md) | Sample roster CSVs and what each one exercises |

## AI tooling disclosure

Built with **Claude (Claude Code)** as a pair-programming agent across planning, scaffolding,
code, tests, and docs; the candidate directed scope and decisions and reviewed all output.
Separately, the app ships an optional **Groq (llama-3.3-70b)** feature that maps messy CSV
headers when deterministic auto-detect can't. See [docs/DECISIONS.md](./docs/DECISIONS.md).
