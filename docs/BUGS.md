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

### BUG-003 🟢 Fixed 2026-08-08 — Redundant per-route auth middleware
**Verified.** `app/api/[[...route]]/app.ts:10-23` already applies `clerkMiddleware()` once
and a 401 guard app-wide. Every single handler in `accounts.ts`, `categories.ts`,
`transactions.ts`, `summary.ts`, and `plaid.ts` (broader than originally scoped — same
pattern found in the last two once actually checked) called `clerkMiddleware()` again. Not a
security hole (defense in depth is harmless), but it's dead weight and makes the real guard
harder to find.
**Fix applied:** removed the per-route `clerkMiddleware()` calls (and the now-unused import)
from all five route files; `app.ts`'s app-level middleware is the only place it runs now.
**Note (scope correction):** the per-handler `const auth = getAuth(c); if (!auth.userId) {...}`
checks were **kept**, not dropped as originally planned — `getAuth()`'s return type has
`userId: string | null`, so TypeScript can't know the app-level guard already ran; removing
the check would either break `tsc --noEmit` (passing a possibly-null `userId` into
`eq(accounts.userId, ...)` / a `.notNull()` insert column) or require scattering non-null
assertions instead. The check now exists purely for type narrowing, not as a second security
check — that's still worth keeping, just for a different reason than BUG-003 originally
assumed.

### BUG-004 🟢 Fixed 2026-08-08 — No indexes anywhere in the schema
**Verified.** `db/schema.ts` had zero `.index()` / index definitions. Every list query
filters by `accounts.userId`, `categories.userId`, or joins `transactions` to `accounts` and
filters by date range — all full scans.
**Fix applied:** added indexes on `accounts.userId`, `categories.userId`,
`transactions(accountId, date)`, `transactions.categoryId` (`db/schema.ts`), generated via
`npx drizzle-kit generate` (`drizzle/0006_true_leader.sql`), applied via
`npx drizzle-kit migrate`.
**Measured (honestly, not fabricated):** ran `EXPLAIN ANALYZE` on the GET /transactions query
shape (join transactions→accounts→categories, filtered by a real `user_id`) against the live
dev DB — 90 transactions, 17 accounts, 63 categories. Before: `Seq Scan` throughout, 0.187ms
execution. After: **still `Seq Scan` throughout, 0.123ms** — the difference is noise, not the
index. At this row count, Postgres's planner correctly prefers a sequential scan; an index
scan only wins once a table is large enough that the index's overhead is worth it (typically
four-to-five-figure row counts, not 90). Confirmed the indexes are real and usable anyway by
re-running with `SET enable_seqscan = off`: the plan switches to
`Index Scan using transactions_category_id_idx` / `accounts_pkey` / `categories_pkey` and
still completes in 0.171ms. So: the indexes are correctly built and will matter once this
table has real production volume, but there is no honest "420→270"-style number to report
today — the dataset is too small for the index to change anything yet. Re-run this
measurement once the table has thousands of rows.

### BUG-019 🔴 `npm run lint` currently fails project-wide (pre-existing, unrelated to BUG-001..018)
**Verified**, found incidentally while confirming lint was clean after the BUG-003/BUG-004
changes — `npx eslint .` reports 1 error (`@typescript-eslint/no-explicit-any` in
`components/custom-tooltip.tsx:5`) and 6 warnings (an incompatible-library warning in
`components/data-table.tsx`, four `formSchema` unused-as-value warnings in the
account/category sheet components, one unused `queryClient` in
`features/plaid/api/use-exchange-public-token.ts`) across files this session never touched.
Not fixed here — out of scope for BUG-003/BUG-004, and touches several unrelated files.
**Fix:** address each individually; the plaid one overlaps with BUG-009's TODO.

---

## Priority 2

### BUG-005 🔴 Duplicate-name race on accounts/categories — BLOCKED, needs a decision
**Verified, and worse than expected: this has already happened in production**, not just a
theoretical race. `accounts.ts` and `categories.ts` do an app-level `select`
(case-insensitive, trimmed match) then `insert` — classic check-then-act. Two concurrent
requests (e.g. a double-click) can both pass the check and insert duplicate names.

Checked the live dev DB directly (2026-08-08) before attempting the fix: user
`user_3ARwkpDyxNuobnknXHhlpffgH6u` already has **real duplicate rows** —
`accounts`: "Savings Account" ×4, "Cash Wallet" ×4; `categories`: "Education" ×4, "Rent" ×4,
"Gift" ×4, "Interest" ×4, "Transfer" ×4 (all same normalized name, same user).

**This blocks the straightforward fix.** A `CREATE UNIQUE INDEX` migration will fail outright
against data that already violates it. Fixing this requires deciding how to handle the
existing duplicates before the constraint can be added:
1. Pick a canonical row per `(user_id, lower(trim(name)))` group (e.g. oldest `id`),
   re-point every `transactions` row referencing a duplicate's `id` to the canonical row's
   `id`, then delete the duplicate rows — then add the unique index.
2. Or: rename the duplicates (e.g. append a suffix) instead of merging, preserving all rows
   and their transaction history as-is, then add the unique index.

Both mutate/delete real stored rows and rewire foreign keys — **not attempted without the
user's go-ahead on which approach they want.**
**Fix (once unblocked):** add a DB-level `UNIQUE (user_id, lower(trim(name)))` constraint via
`uniqueIndex` in `db/schema.ts`; wrap the `POST /` insert in accounts.ts/categories.ts in a
try/catch for the unique-violation (Postgres code `23505`) and fall back to returning the
existing row, preserving the current idempotent-create UX instead of 500ing on the race.

### BUG-006 🟢 Fixed 2026-08-08 — Date-range filter drops same-day transactions after midnight
**Verified.** `GET /api/transactions` (`transactions.ts`) parsed `to` with
`parse(to, "yyyy-MM-dd", new Date())`, which lands on `00:00:00`, then filtered with
`lte(transactions.date, endDate)`. Any transaction on the `to` date after midnight was
excluded from the range. The identical pattern also existed in `summary.ts`'s `to` handling.
**Fix applied:** both now wrap the parsed `to` date in date-fns' `endOfDay()` before
comparing.
**Not fixed (separate, smaller issue):** seed data (`scripts/seed.ts`) uses whole-day
timestamps with no time component, so this bug was invisible against seeded data. Left as-is
for now — randomizing seed times is cosmetic/test-quality, not a correctness bug, and safe to
defer.
**Test:** `transactions.ownership.test.ts` — "GET /transactions date-range boundary (BUG-006,
fixed)" spies on the real `lte` from drizzle-orm and asserts the `to` date it receives is
`23:59:59`, not midnight.

### BUG-007 🔴 Amounts stored as whole-dollar integer but UI accepts cents
**Verified.** `db/schema.ts:53` — `amount: integer("amount")`. `components/amount-input.tsx`
uses `react-currency-input-field` with `decimalScale={2}` / `decimalsLimit={2}`, i.e. the UI
happily accepts `$12.34`. `insertTransactionSchema` only requires `z.number().finite()`, no
integer constraint. A decimal amount sent to an `integer` column will error or be coerced —
not stored as entered.
**Fix:** migrate to storing cents. Expand-contract: add new column -> backfill -> switch
reads/writes to it -> drop old column. Do not do a blind in-place type change.

### BUG-008 🟢 Fixed 2026-08-08 — `NEXT_PUBLIC_API_URL` missing env var crashes the whole app
**Verified.** `lib/hono.ts` threw at **module import time** if the env var was unset. Since
this module is imported by every feature's API hook, one missing env var blank-screened the
entire app instead of failing one request.
**Fix applied:** `client` is now a `Proxy` that lazily constructs the real `hc<AppType>()`
client (and does the env-var check) on first actual property access, not at import time.
Methods returned through the proxy are `.bind()`ed to the real client so `this` stays
correct. Verified with a throwaway script: importing `@/lib/hono` with
`NEXT_PUBLIC_API_URL` unset now succeeds; only actually using `client` throws, and the error
is still the same catchable message. All 22 consumer files (`features/**/api/use-*.ts`)
needed no changes — same `client.api.xxx` shape.

### BUG-018 🟢 Fixed 2026-08-08 — `db/drizzle.ts` also crashed at import time without `DATABASE_URL`
**Verified.** `db/drizzle.ts` called `neon(process.env.DATABASE_URL!)` at module load, not
inside a request handler. Same failure mode as BUG-008, different module.
**Fix applied:** same `Proxy` + lazy-construction + `.bind()` pattern as BUG-008, applied to
both `sql` (the Neon tagged-template client — its proxy target is a function so it stays
callable as `` sql`...` ``) and `db` (the drizzle instance). Verified two ways: (1) a
throwaway script confirmed import succeeds with `DATABASE_URL` unset and only usage throws;
(2) a smoke test against the **live dev DB** confirmed `db.select().from().where()` and
`` sql`select 1` `` both still work correctly through the proxy (this mattered because a
naive proxy `get` trap without `.bind()` would silently break `this`-dependent methods on the
real drizzle/neon client objects).

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
