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

## Latest results

| Suite | Command | Result |
|-------|---------|--------|
| Unit (Vitest) | `npm run test:run` | **54 passed** / 54 (10 files) |
| End-to-end (Playwright) | `npm run test:e2e` | **16 passed** / 16 (TC-01–TC-16) |

## Unit test coverage — 54 tests / 10 files

| Area | File | Tests | What it locks down |
|------|------|------:|--------------------|
| Roster validation | `lib/roster/validation.test.ts` | 18 | missing size; **duplicate jersey # per squad**; coach exemption; SKU exists/active/size-match; required-when-present product/qty |
| Order visibility | `lib/orders/queries.test.ts` | 8 | role-scoped lists + per-order access (designer can't see drafts, club scoped to own) |
| ERP queue logic | `lib/erp/queue-logic.test.ts` | 6 | retry/backoff, max-attempt dead-letter, due-time |
| RBAC | `lib/rbac.test.ts` | 5 | the `can(role, action)` permission matrix per role (incl. Super Admin) |
| Design lock | `lib/design/lock-rules.test.ts` | 4 | legal transitions + **409 immutability** |
| Roster editor (UI) | `components/RosterRowsEditor.test.tsx` | 4 | live re-validation as cells change; submit gating |
| Column mapping | `lib/roster/column-mapping.test.ts` | 3 | header synonym auto-detect + unmatched reporting |
| ERP adapter | `lib/erp/adapter.test.ts` | 2 | status mapping + sales-order payload build |
| Clean-CSV normalizer | `lib/roster/normalizer.test.ts` | 2 | parse + map to canonical rows; manual override |
| Xero invoice | `lib/xero/invoice.test.ts` | 2 | discount × GST × deposit maths |

## End-to-end tests (Playwright)

`npm run test:e2e` drives the real app (and Supabase) through the headline journeys in a real
browser. It uses the **Page Object Model**: page objects under `e2e/pages/` (`BasePage`,
`RosterUploadPage`, `OrderPage`) hold the selectors, `e2e/fixtures.ts` injects them plus
`login()` / `createOrder()` flows, and `e2e/db.ts` seeds an order directly into a given state
(pending/locked/packed) for state-dependent tests, so the specs read like the workflow.

| Test | File | Covers |
|------|------|--------|
| TC-01–05 | `auth.spec.ts` | Auth & RBAC: redirect when signed out; each role lands on the right page with only its own nav |
| TC-06 | `roster.spec.ts` | Valid roster validates → submit creates a Draft order |
| TC-07 | `roster.spec.ts` | Invalid roster shows the errors and disables submit |
| TC-08 | `lifecycle.spec.ts` | Full lifecycle: submit → designer uploads a proof → client approves & locks |
| TC-09 | `lifecycle.spec.ts` | Submitting an order lands a notification on the designer's bell |
| TC-10 | `visibility.spec.ts` | A designer gets a 404 opening a Draft order by direct URL |
| TC-11 | `visibility.spec.ts` | Warehouse gets a 404 opening a Pending Approval order |
| TC-12 | `design-lock.spec.ts` | A locked order rejects further lock attempts with **409** (immutability) |
| TC-13 | `design-lock.spec.ts` | A designer is forbidden (**403**) from locking |
| TC-14 | `design-lock.spec.ts` | Client requests a revision; the note posts to the conversation thread |
| TC-15 | `fulfillment.spec.ts` | Warehouse marks a locked order packed → invoice flips to Issued |
| TC-16 | `fulfillment.spec.ts` | The quote reflects the club's discount tier (Silver 10%) |

Isolation: a dedicated `e2e_club` is created in global setup and **all** its orders (including
the directly-seeded ones) are deleted in teardown, so test runs never touch the demo data. Auth
uses a **dev-only** `/api/dev-login` route (returns 404 in production).

## Manual QA scenarios

Run as a functional pass before submitting. Sample CSVs are in this folder. Scenarios marked
**[E2E]** are now covered by the automated Playwright suite above; the rest are a manual pass
(they need things the headless suite doesn't drive, e.g. real AI mapping, the notification
dropdown's hover-to-read, or visual checks).

### Roster upload & validation
- **QA-01** Valid roster (e.g. `roster-30-standard.csv`) → all rows valid, submit enabled. **[E2E TC-06]**
- **QA-02** Missing Size → row flagged, submit disabled.
- **QA-03** Duplicate jersey # in the **same** squad → both flagged.
- **QA-04** Same jersey # in **different** squads → not flagged.
- **QA-05** Messy headers (`roster-messy-headers.csv`) → auto-detect/manual maps correctly.
- **QA-06** AI mapping ON (Super Admin → Settings, needs `GROQ_API_KEY`) + `ai-assist-test-roster.csv`
  → "AI-assisted mapping applied" badge; OFF → manual mapping step.
- **QA-07** `roster-invalid-data.csv` → every rule fires (unknown SKU, dup #, size mismatch,
  missing size, bad qty, missing product). Submit stays disabled. **[E2E TC-07]**
- **QA-08** Coach row with blank number → valid (exempt).
- **QA-09** Remove a SKU/qty in a product order → "Missing product SKU / quantity".
- **QA-22** Draft order → **Replace roster** (header link) → upload a different CSV → the editable
  table reloads with the new rows; **Save changes** persists them (nothing saved until then).

### Design collaboration & lock
- **QA-10** Client uploads a reference; Designer uploads a proof (confirm-before-save, optional note).
- **QA-11** Client **Request Revision** (note required) → posts to thread + flags revision. **[E2E TC-14]**
- **QA-12** Designer uploads a new version → flips back to "in review", v-number increments.
- **QA-13** Client **Approve & Lock** (two-step: an *optional* approval note, then Confirm &
  lock; blocked until a proof exists) → Locked/Ready; any note posts to the thread. **[E2E TC-08]**
- **QA-14** Edit a locked order via API → **409**. Designer attempts lock → **403**. **[E2E TC-12, TC-13]**

### Lifecycle, pricing & integration
- **QA-15** Dashboard reflects each transition; role scoping (designer no drafts; warehouse only
  locked/packed). **[E2E TC-10, TC-11]**
- **QA-16** Quote/invoice totals change with the account's discount tier (Gold vs Bronze). **[E2E TC-16]**
- **QA-17** Integration console (**Super Admin only**; Warehouse no longer has it): toggle ERP
  maintenance in Settings → Process queue → job retries (PENDING, attempts climb); bring ERP
  online → Process → DONE; idempotent (no duplicate jobs). Jobs process **FIFO** (oldest first).
- **QA-22b** Dead-letter recovery: leave ERP in maintenance and Process until a job hits 5/5 →
  it moves to the **Failed jobs** table and the **Super Admin gets a notification**. Bring ERP
  online → **Requeue** (one) or **Requeue all** → job(s) return to the queue as PENDING with
  attempts reset (Requeue does **not** auto-process) → Process queue → DONE.
- **QA-18** Mark packed → status Packed, mock Xero invoice event in the audit log, invoice marked Issued. **[E2E TC-15]**
- **QA-19** Warehouse pick list groups rows by pack group.
- **QA-20** Unauthenticated page access → redirect to login. **[E2E TC-01]**
- **QA-21** Notifications: submit → Designer notified; proof/comment → Client; revision →
  Designer; lock → Warehouse + Designer; packed → Client + Designer; **ERP job dead-lettered →
  Super Admin**. Bell badge shows the real unread count on load; hovering an item (briefly
  lingering) marks just that one read. (Submit → Designer is **[E2E TC-09]**; the rest are a
  manual pass.)
- **QA-23** Activity timeline is complete: order created, roster validated, reference/proof
  uploaded (proof shows `vN` + note), comments added, revision requested, design locked, packed,
  invoice generated — each with actor + timestamp.
- **QA-24** Order numbers display as **`#B2B00000NN`** in the UI (dashboard, order title,
  integration, notifications); the ERP `external_order_ref` is bare **`B2B00000NN`** and the Xero
  ref is **`INV-B2B00000NN`**.

## Notes

- A `GET /api/dev-login` route (dev-only, 404 in production) lets the E2E tests reach
  authenticated pages without the login form.
- **Unit tests** run on the pure logic with no database; the **E2E suite** and the manual
  scenarios exercise the real Supabase-backed flow. Several manual scenarios above (TC-08-style
  lock flow, role nav, validation) are now automated in the Playwright suite; the rest remain a
  manual pass.
