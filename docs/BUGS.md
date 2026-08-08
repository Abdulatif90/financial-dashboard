# Bugs & Technical Debt

Living tracklist. Every entry is either verified against the current code (✅ Verified) or
still needs verification (🔍 Unverified — do not act on it until checked). Status moves
`Open -> In Progress -> Fixed` as work lands; fixed entries stay here (struck through) instead
of being deleted, so the audit trail survives.

Source: initial pass combined a mentor's prioritized review (Tier 1-3, cost/impact ordered)
with a direct code audit on 2026-08-08. Entries the mentor's list raised that turned out
**not** to apply to this codebase are recorded at the bottom under "Checked, not applicable" —
keeping them visible is more honest than silently dropping them.

Status legend: 🔴 Open · 🟡 In Progress · 🟢 Fixed

---

## Priority 1 — cheap, high impact

### BUG-001 🟢 Fixed 2026-08-08 — IDOR on transaction create — accountId/categoryId ownership never checked
**Verified.** `POST /api/transactions` and `POST /api/transactions/bulk-create`
(`app/api/[[...route]]/transactions.ts:100-141`) insert whatever `accountId`/`categoryId`
the client sends, with no check that they belong to `auth.userId`. Any authenticated user who
knows or guesses another user's account ID can attach a transaction to it.
**Fix:** verify `accountId` (and `categoryId`, if set) belongs to the caller before insert;
404 if not.
**Test:** `app/api/[[...route]]/transactions.ownership.test.ts` — "POST /transactions
ownership" and "POST /transactions/bulk-create ownership" assert `404` for a foreign
`accountId`, plus a passing-case test confirming an owned account still succeeds.

### BUG-002 🟢 Fixed 2026-08-08 — Same IDOR gap on transaction edit
**Verified.** `PATCH /api/transactions/:id` (`transactions.ts:179-223`) confirms the
transaction *being edited* is owned via a CTE join, but never checks that a **new**
`accountId` in the payload also belongs to the caller. A user can move their own transaction
onto someone else's account.
**Fix:** validate the new `accountId`'s ownership before applying the update.
**Test:** `transactions.ownership.test.ts` — "PATCH /transactions/:id ownership" asserts
`404` for a foreign `accountId`.

### BUG-003 🔴 Redundant per-route auth middleware
**Verified.** `app/api/[[...route]]/app.ts:10-23` already applies `clerkMiddleware()` once
and a 401 guard app-wide. Every single handler in `accounts.ts`, `categories.ts`, and
`transactions.ts` calls `clerkMiddleware()` again and re-checks `!auth.userId` manually. Not
a security hole (defense in depth is harmless), but it's dead weight and makes the real guard
harder to find.
**Fix:** drop the per-route `clerkMiddleware()` calls and redundant guards; trust the
app-level middleware.

### BUG-004 🔴 No indexes anywhere in the schema
**Verified.** `db/schema.ts` has zero `.index()` / index definitions. Every list query
filters by `accounts.userId`, `categories.userId`, or joins `transactions` to `accounts` and
filters by date range — all full scans today.
**Fix:** add indexes on `accounts.userId`, `categories.userId`, `transactions(accountId, date)`,
`transactions.categoryId`. Run `EXPLAIN ANALYZE` before and after and record both numbers here.

---

## Priority 2

### BUG-005 🔴 Duplicate-name race on accounts/categories
**Verified.** `accounts.ts:79-94` and `categories.ts:79-94` do an app-level
`select` (case-insensitive, trimmed match) then `insert` — classic check-then-act. Two
concurrent requests (e.g. a double-click) can both pass the check and insert duplicate names.
**Fix:** add a DB-level `UNIQUE (user_id, lower(trim(name)))` constraint; let the DB reject
the race instead of the app layer racing itself.

### BUG-006 🔴 Date-range filter drops same-day transactions after midnight
**Verified.** `GET /api/transactions` (`transactions.ts:17-33`) parses `to` with
`parse(to, "yyyy-MM-dd", new Date())`, which lands on `00:00:00`, then filters with
`lte(transactions.date, endDate)`. Any transaction on the `to` date after midnight is
excluded from the range.
**Fix:** normalize to end-of-day (`23:59:59.999`) before comparing. Also: seed data
(`scripts/seed.ts`) uses whole-day timestamps with no time component, so this bug is
invisible against seeded data — randomize seed transaction times as part of the fix so the
bug can't hide again.
**Test:** `transactions.ownership.test.ts` — "GET /transactions date-range boundary" spies on
the real `lte` from drizzle-orm and asserts the `to` date it receives is local midnight
(the bug); flip to assert end-of-day once fixed.

### BUG-007 🔴 Amounts stored as whole-dollar integer but UI accepts cents
**Verified.** `db/schema.ts:53` — `amount: integer("amount")`. `components/amount-input.tsx`
uses `react-currency-input-field` with `decimalScale={2}` / `decimalsLimit={2}`, i.e. the UI
happily accepts `$12.34`. `insertTransactionSchema` only requires `z.number().finite()`, no
integer constraint. A decimal amount sent to an `integer` column will error or be coerced —
not stored as entered.
**Fix:** migrate to storing cents. Expand-contract: add new column -> backfill -> switch
reads/writes to it -> drop old column. Do not do a blind in-place type change.

### BUG-008 🔴 `NEXT_PUBLIC_API_URL` missing env var crashes the whole app
**Verified.** `lib/hono.ts:4-7` throws at **module import time** if the env var is unset.
Since this module is imported by every feature's API hook, one missing env var blank-screens
the entire app instead of failing one request.
**Fix:** move the check out of module scope (e.g. validate lazily inside the client factory,
or fail per-call with a catchable error).

### BUG-018 🔴 `db/drizzle.ts` also crashes at import time without `DATABASE_URL`
**Verified.** `db/drizzle.ts:4` — `neon(process.env.DATABASE_URL!)` runs at module load, not
inside a request handler. Same failure mode as BUG-008, different module: any route/script
that imports `@/db/drizzle` without `DATABASE_URL` set fails at import, before any request-
level error handling can catch it. Relevant for tests too — route handler tests must
`vi.mock("@/db/drizzle")` before importing the route, or the import itself throws.
**Fix:** same pattern as BUG-008 — construct the client lazily instead of at module scope.

---

## Plaid integration — incomplete (found during initial resume, 2026-08-08)

### BUG-009 🔴 No query invalidation / state update after bank connect
**Verified.** `features/plaid/api/use-exchange-public-token.ts:25-28` — `onSuccess` has a
bare `// TODO`, nothing is invalidated or refetched after a successful connect.

### BUG-010 🔴 `connectBank` hardcoded to `null` in Settings UI
**Verified.** `app/(dashboard)/settings/settings-card.tsx:15` — `const connectBank = null;`.
There is no GET endpoint to check real connection status, so the UI can never show "Bank
account connected" even when one is.

### BUG-011 🔴 No transaction sync/import endpoint
**Verified.** `app/api/[[...route]]/plaid.ts` only has `create-link-token` and
`exchange-public-token`. README.md claims "Import transactions automatically" / "Sync
financial data" — no `transactionsSync` call or endpoint backs that claim anywhere in the repo.

### BUG-012 🔴 No disconnect/unlink-bank flow
**Verified.** No delete/unlink endpoint or UI action exists for `connectedBanks` rows.

### BUG-013 🔴 `connectedBanks` table missing `itemId`
**Verified.** `db/schema.ts:87-91` — only `id`, `userId`, `accessToken`. Plaid webhooks and
item management (including sync cursors, disconnect) key off `item_id`, which isn't stored.

### BUG-014 🔴 `PLAID_ENV` documented but unused
**Verified.** README.md lists `PLAID_ENV` as a required env var, but `plaid.ts:11-12`
hardcodes `basePath: PlaidEnvironments.sandbox`. The env var has no effect. Either wire it up
or drop it from the documented env list — currently it's a docs/code mismatch, low priority.

---

## Repo / environment status (not code bugs, but blocking)

### BUG-015 🔴 Zero git commits
Working tree is fully untracked as of 2026-08-08. Nothing is checkpointed.

### BUG-016 🟢 No `.env` file
Fixed 2026-08-08 — `.env` created with the required keys (`DATABASE_URL`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`,
`PLAID_ENV`, `NEXT_PUBLIC_API_URL`), values left blank for the user to fill in.

### BUG-017 🔴 Zero automated tests
No test framework installed, no test files (excluding `node_modules`). See docs/PLAN.md for
the setup + first-suite plan.

---

## Priority 3 — test coverage gaps

Tracked as work, not bugs: see docs/PLAN.md "Tier 3 — tests" for the specific test list
(ownership tests for every write path, plus the two integrity tests for BUG-006/BUG-007).
Any *new* bug a test uncovers gets appended here with the next BUG-0xx number, in the section
that matches its priority.

---

## Deliberately left open (documented trade-offs, not gaps)

- **`drizzle-orm/neon-http` does not support multi-statement transactions**
  (`db/drizzle.ts:2`). Acceptable today because every write touches a single table; the day a
  delete needs to cascade across tables, this driver has to change.
- **No caching layer.** No measured need for one yet.

---

## Checked, not applicable to this repo

- **"Stop returning `access_token` to the browser"** — the mentor's list raised this, but
  `plaid.ts:76` already returns only `{ data: { connected: true } }`. The access token never
  leaves the server. No action needed here — this item likely applies to a different project
  in the same review batch (the mentor's notes referenced "SkyCode" and "AURUX" elsewhere).
- **"404 not 403 on ownership failures"** — already the case throughout `accounts.ts` and
  `categories.ts` (e.g. `accounts.ts:165`, `categories.ts:165`). No action needed.
