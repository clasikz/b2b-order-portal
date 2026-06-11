# Testing & QA

The portal is verified at three levels: **unit tests** over the pure business logic,
**end-to-end tests** (Playwright) that drive the real app through the key journeys, and a set
of **manual QA scenarios** for anything not yet automated.

## Strategy

The business rules live in **pure, framework-free functions** (validation, RBAC, the lock
state machine, the ERP queue logic, pricing). That makes them cheap and reliable to unit-test,
and the same functions run in the UI and on the server, so behaviour can't drift. The
end-to-end suite then proves the screens, uploads, role handoffs, and notifications actually
work together.

```bash
npm run test        # unit tests, watch mode
npm run test:run    # unit tests, single run (CI)
npm run test:e2e    # end-to-end tests (Playwright)
```

## Automated test coverage — 53 tests / 10 files

| Area | File | Tests | What it locks down |
|------|------|------:|--------------------|
| Roster validation | `lib/roster/validation.test.ts` | 18 | missing size; **duplicate jersey # per squad**; coach exemption; SKU exists/active/size-match; required-when-present product/qty |
| Order visibility | `lib/orders/queries.test.ts` | 8 | role-scoped lists + per-order access (designer can't see drafts, club scoped to own) |
| ERP queue logic | `lib/erp/queue-logic.test.ts` | 6 | retry/backoff, max-attempt dead-letter, due-time |
| RBAC | `lib/rbac.test.ts` | 4 | the `can(role, action)` permission matrix per role |
| Design lock | `lib/design/lock-rules.test.ts` | 4 | legal transitions + **409 immutability** |
| Roster editor (UI) | `components/RosterRowsEditor.test.tsx` | 4 | live re-validation as cells change; submit gating |
| Column mapping | `lib/roster/column-mapping.test.ts` | 3 | header synonym auto-detect + unmatched reporting |
| ERP adapter | `lib/erp/adapter.test.ts` | 2 | status mapping + sales-order payload build |
| Clean-CSV normalizer | `lib/roster/normalizer.test.ts` | 2 | parse + map to canonical rows; manual override |
| Xero invoice | `lib/xero/invoice.test.ts` | 2 | discount × GST × deposit maths |

## End-to-end tests (Playwright)

`npm run test:e2e` drives the real app (and Supabase) through the headline journeys in a real
browser. It uses the **Page Object Model**: page objects under `e2e/pages/` (`BasePage`,
`RosterUploadPage`, `OrderPage`) hold the selectors, and `e2e/fixtures.ts` injects them plus
`login()` / `createOrder()` flows, so the specs read like the workflow.

| Test | Covers |
|------|--------|
| TC-01–05 | Auth & RBAC: redirect when signed out; each role lands on the right page with only its own nav |
| TC-06 | Valid roster validates → submit creates a Draft order |
| TC-07 | Invalid roster shows the errors and disables submit |
| TC-08 | Full lifecycle: submit → designer uploads a proof → client approves & locks |
| TC-09 | Submitting an order lands a notification on the designer's bell |

Isolation: a dedicated `e2e_club` is created in global setup and its orders are deleted in
teardown, so test runs never touch the demo data. Auth uses a **dev-only** `/api/dev-login`
route (returns 404 in production).

## Manual QA scenarios

Run as a functional pass before submitting. Sample CSVs are in this folder.

### Roster upload & validation
- **QA-01** Valid roster (e.g. `roster-30-standard.csv`) → all rows valid, submit enabled.
- **QA-02** Missing Size → row flagged, submit disabled.
- **QA-03** Duplicate jersey # in the **same** squad → both flagged.
- **QA-04** Same jersey # in **different** squads → not flagged.
- **QA-05** Messy headers (`roster-messy-headers.csv`) → auto-detect/manual maps correctly.
- **QA-06** AI mapping ON (Super Admin → Settings, needs `GROQ_API_KEY`) + `ai-assist-test-roster.csv`
  → "AI-assisted mapping applied" badge; OFF → manual mapping step.
- **QA-07** `roster-invalid-data.csv` → every rule fires (unknown SKU, dup #, size mismatch,
  missing size, bad qty, missing product).
- **QA-08** Coach row with blank number → valid (exempt).
- **QA-09** Remove a SKU/qty in a product order → "Missing product SKU / quantity".

### Design collaboration & lock
- **QA-10** Client uploads a reference; Designer uploads a proof (confirm-before-save, optional note).
- **QA-11** Client **Request Revision** (note required) → posts to thread + flags revision.
- **QA-12** Designer uploads a new version → flips back to "in review", v-number increments.
- **QA-13** Client **Approve & Lock** (blocked until a proof exists) → Locked/Ready.
- **QA-14** Edit a locked order via API → **409**. Designer attempts lock → **403**.

### Lifecycle, pricing & integration
- **QA-15** Dashboard reflects each transition; role scoping (designer no drafts; warehouse only
  locked/packed).
- **QA-16** Quote/invoice totals change with the account's discount tier (Gold vs Bronze).
- **QA-17** Integration console: toggle ERP maintenance → Process queue → job retries (PENDING,
  attempts climb); bring ERP online → Process → DONE; idempotent (no duplicate jobs).
- **QA-18** Mark packed → status Packed, mock Xero invoice event in the audit log, invoice marked Issued.
- **QA-19** Warehouse pick list groups rows by pack group.
- **QA-20** Unauthenticated page access → redirect to login.
- **QA-21** Notifications: submit → Designer notified; proof/comment → Client; revision →
  Designer; lock → Warehouse + Designer; packed → Client + Designer. Bell badge shows the real
  unread count on load; hovering an item (briefly lingering) marks just that one read.

## Notes

- A `GET /api/dev-login` route (dev-only, 404 in production) lets the E2E tests reach
  authenticated pages without the login form.
- **Unit tests** run on the pure logic with no database; the **E2E suite** and the manual
  scenarios exercise the real Supabase-backed flow. Several manual scenarios above (TC-08-style
  lock flow, role nav, validation) are now automated in the Playwright suite; the rest remain a
  manual pass.
