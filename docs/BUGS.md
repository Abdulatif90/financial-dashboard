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

### BUG-019 🟢 Fixed 2026-08-08 — `npm run lint` currently fails project-wide (pre-existing, unrelated to BUG-001..018)
**Verified**, found incidentally while confirming lint was clean after the BUG-003/BUG-004
changes — `npx eslint .` reports 1 error (`@typescript-eslint/no-explicit-any` in
`components/custom-tooltip.tsx:5`) and 6 warnings (an incompatible-library warning in
`components/data-table.tsx`, four `formSchema` unused-as-value warnings in the
account/category sheet components, one unused `queryClient` in
`features/plaid/api/use-exchange-public-token.ts`) across files this session never touched.
**Fix applied:**
- `components/custom-tooltip.tsx`: replaced the `any` prop type with
  `Partial<TooltipContentProps<number, string>>` (Recharts' real tooltip-content prop type,
  imported as a type-only import). `Partial` because `<CustomTooltip />` is written with no
  props in `line-variant.tsx`/`bar-variant.tsx`/`aria-variant.tsx` — Recharts clones the
  element and injects `active`/`payload`/etc. at render time, so the props can't be required
  at JSX-creation time. `payload[0]`/`payload[1]`'s `.value` is `number | undefined` in the
  real type (it wasn't checked at all under `any`), so those reads are now wrapped in
  `Number(... ?? 0)`.
- `edit-account-sheet.tsx` / `new-account-sheet.tsx` / `edit-category-sheet.tsx` /
  `new-category-sheet.tsx`: each had a local `const formSchema = insert*Schema.pick({ name:
  true })` used only for `z.input<typeof formSchema>` — the actual runtime validation happens
  inside `AccountForm`/`CategoryForm`, which own their own `formSchema` + `zodResolver`. Removed
  the unused runtime binding; `FormValues` is now derived directly as
  `Pick<z.input<typeof insertAccountSchema>, "name">` (or `insertCategorySchema` for the
  category sheets) — same type, no dead value.
**Left as-is (explicitly out of scope, see task notes):**
- `components/data-table.tsx`'s React Compiler "incompatible library" warning about
  `useReactTable()` — framework-level limitation (TanStack Table's API isn't
  compiler-memoizable), not a code bug.
- `features/plaid/api/use-exchange-public-token.ts`'s unused `queryClient` — ties directly to
  BUG-009's unfinished `onSuccess` TODO (query invalidation after bank connect), which is
  deferred, lower-priority Plaid work. Fixing the warning without implementing invalidation
  would just mean deleting the variable and losing the TODO's context.
**Verified:** `npx eslint .` now reports 0 errors, 2 warnings (exactly the two left-as-is
above). `npx tsc --noEmit` clean. `npx vitest run` still 14/14.

### BUG-020 🟢 Fixed 2026-08-08 — `npm run db:seed` is broken — `ts-node` isn't a dependency
**Verified**, found incidentally while re-seeding for BUG-007. `package.json`'s
`"db:seed": "ts-node scripts/seed.ts"` fails with `'ts-node' is not recognized` — the project
uses `tsx` everywhere else (it's a devDependency; `ts-node` isn't). Worked around it for this
session's re-seed by running `npx tsx scripts/seed.ts` directly.
**Fix applied:** changed the script to `"db:seed": "tsx scripts/seed.ts"` in `package.json`.
Not re-run here (out of scope — this is a code-only change; the script was already verified
working via `npx tsx scripts/seed.ts` during the BUG-007 session).

---

## Priority 2

### BUG-005 🟢 Fixed 2026-08-08 — Duplicate-name race on accounts/categories
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

**User chose: merge.** Ran a script that grouped duplicates by `(user_id, lower(trim(name)))`,
picked the row with the most attached transactions as canonical per group (ties broken by
`id`), re-pointed every `transactions.account_id`/`category_id` referencing a duplicate onto
the canonical row inside a `sql.transaction([...])` batch per row (atomic update+delete),
then deleted the duplicates. Verified zero duplicates remain afterward. Merged: 2 account
groups ("Savings Account", "Cash Wallet"), 5 category groups ("Transfer", "Rent", "Interest",
"Education", "Gift") — all for one user, all real data, all pre-existing before this session.

**Fix applied:** added a DB-level `UNIQUE (user_id, lower(trim(name)))` constraint via
`uniqueIndex` in `db/schema.ts` for both tables (`drizzle/0007_wild_supreme_intelligence.sql`,
applied to the live DB). `accounts.ts`/`categories.ts`'s `POST /` now wraps the insert in a
try/catch: on a genuine race (Postgres error code `23505`), it re-queries and returns the
existing row instead of 500ing — same idempotent-create UX as the pre-check path, just backed
by a real constraint instead of a racy select-then-insert.
**Verified:** a throwaway script confirmed the index rejects a case/whitespace-insensitive
duplicate (`"Duplicate Test"` vs `"  duplicate test  "`) with exactly error code `23505`.

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

### BUG-007 🟢 Fixed 2026-08-08 — Amounts stored as whole-dollar integer but UI accepts cents
**Verified.** `db/schema.ts` used `amount: integer("amount")`, which is fine for cents, but
nothing enforced that the value stored there actually *was* cents.
`components/amount-input.tsx` uses `react-currency-input-field` with `decimalScale={2}` /
`decimalsLimit={2}`, i.e. the UI happily accepts `$12.34`. `insertTransactionSchema` only
required `z.number().finite()`, no integer constraint. A decimal amount sent to an `integer`
column would error or be coerced — not stored as entered.

**Bigger finding while investigating:** the CSV import path
(`app/(dashboard)/transactions/page.tsx`'s `parseCsvAmount`) already did
`Math.round(parsedAmount * 100)` — i.e. it was **already** storing cents — while the manual
`TransactionForm` path stored raw dollars. Two creation paths, two different units, silently.
Checked the live dev DB's ~90 transactions before touching anything: found exact ×100
duplicate pairs (e.g. Yandex Go at both `-5` and `-500`; Apteka 999 at both `-13` and
`-1300`), confirming this wasn't theoretical — the data was already corrupted by the unit
mismatch. Asked the user whether this was real financial data or disposable test data; they
confirmed it was CSV test data written for testing, safe to clear rather than needing
per-row unit forensics. Cleared `transactions` (accounts/categories, already deduplicated
under BUG-005, were kept) and re-seeded with `scripts/seed.ts` (now cents-aware).

**Fix applied** (no expand-contract needed — the column type doesn't change, only the
semantic meaning, and there was no real data to preserve once confirmed disposable):
- `lib/utils.ts`: added `convertAmountToCents`/`convertAmountFromCents` as the single source
  of truth for the ×100 factor; `formatCurrency` now takes cents and divides internally.
- `db/schema.ts`: `insertTransactionSchema.amount` is now `z.number().int(...)` — rejects any
  non-integer amount reaching the API, closing the gap the original bug report described.
- `features/transactions/components/new-transaction-sheet.tsx` /
  `edit-transaction-sheet.tsx`: convert dollars → cents on submit, cents → dollars when
  populating the edit form's `defaultValues`.
- `app/(dashboard)/transactions/columns.tsx`: dropped its own separate `amountFormatter` in
  favor of the shared `formatCurrency` (was already displaying raw un-formatted cents as if
  they were dollars — a second, related display bug, fixed as part of the same change).
  Same fix applied to the CSV import preview table in `page.tsx`.
- `scripts/seed.ts`: `generateRandomAmount` now multiplies every branch by 100.
- `parseCsvAmount` needed **no change** — it was already doing the right thing; this fix
  brought the manual-entry path in line with it, not the other way around.
**Test:** `db/schema.amount.test.ts` — flipped from documenting the bug to asserting the fix
(`amount: 12.34` now rejected), plus new tests for the convert helpers and `formatCurrency`'s
output (`formatCurrency(1234)` → `"$12.34"`).
**Verified against the live DB:** re-ran the seed script; confirmed all 57 resulting
transaction rows have `amount % 100 = 0` (whole cents).

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
