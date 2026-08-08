# Progress

Live status. Update this at the end of every work session — this file plus git log is what a
new session (or `/tekshir`) reads to resume without re-deriving context. See docs/PLAN.md for
the sequencing and docs/BUGS.md for the full bug list.

## Last updated
2026-08-09 — **README diagrams added**: replaced the plain-text ASCII architecture diagram
with a Mermaid `flowchart`, and added a database ER diagram (`erDiagram`) and two sequence
diagrams (Plaid connect+sync flow, and the ownership-check flow on `POST /transactions`) — all
placed between "🏗 Architecture" and "⚙️ Installation". Every diagram was grounded in the real
code (`db/schema.ts`, `app/api/[[...route]]/{app,plaid,transactions}.ts`,
`lib/plaid-mapping.ts`, `features/plaid/**`) read directly, not idealized. All four diagrams
were extracted and rendered to SVG with `@mermaid-js/mermaid-cli` (`mmdc`) to confirm valid
Mermaid syntax before committing — all four rendered cleanly. `npx tsc --noEmit` clean,
`npx vitest run` 38/38 (unaffected, README-only change). Docs-only, no source files touched.

2026-08-08 — **BUG-011 fixed** (retry dispatch, built on the two artifacts the failed first
attempt left behind): `POST /api/plaid/sync`, account/category find-or-create, upsert/delete
loop, frontend wiring, 19 new tests. Every Plaid bug (BUG-009..BUG-014) is now 🟢. Earlier the
same day: BUG-009/010/012/013 fixed and reviewed (accepted, `/tekshir-finance`); BUG-021
found+fixed via actually running `npm run dev`; BUG-014 fixed directly.

## Current phase
**Phase 3 — Re-audit + README** is done, and **every tracked code bug is now 🟢** — the whole
Plaid block (BUG-009..BUG-014) included. BUG-009/010/012/013 were fixed and independently
reviewed (`/tekshir-finance` — accepted, no deviations); BUG-021 (a real runtime bug none of
`tsc`/`vitest`/`eslint` catch) was found and fixed while verifying `npm run dev`; BUG-014 was
fixed directly. **BUG-011 is now fixed too**, by a retry dispatch after the first attempt died
on a session usage limit — the retry built on the two artifacts that attempt had already
committed (`lib/plaid-mapping.ts` and `connectedBanks.cursor`) rather than redoing them.
What's left: the CV/portfolio text update ("audited" -> "fixed", not actionable from this
repo), and a first real end-to-end run of the sync against Plaid's sandbox (everything so far
is mock-proven only — see "Next").

## Done
- Full code audit against a mentor's prioritized review; verified each claim against the
  actual code rather than trusting it at face value (one claim — access_token exposure —
  turned out not to apply here; documented in docs/BUGS.md "Checked, not applicable")
- docs/BUGS.md created — 18 tracked items (BUG-001..BUG-018), one already fixed (BUG-016)
- docs/PLAN.md created — phased sequence from foundation through re-audit
- `.env` created with required keys, values blank (BUG-016 fixed)
- Memory saved (`project_overview`, `plaid_integration_gaps` in the persistent memory store)
  covering repo state as found
- Vitest installed (`vitest`, `vite-tsconfig-paths`), `vitest.config.ts` added, `npm run test`
  / `npm run test:watch` scripts added to package.json
- First test suite written and passing (3/3):
  - `db/schema.amount.test.ts` — proves BUG-007 (decimal amounts pass validation unchanged)
  - `app/api/[[...route]]/transactions.ownership.test.ts` — proves BUG-001 (POST /transactions
    inserts against a foreign accountId with no ownership check), using a mocked `db` +
    mocked `@hono/clerk-auth` so it runs without a live DB or real Clerk session
  - Note: these tests currently assert the *buggy* behavior on purpose (documented in code
    comments) — they must be flipped to assert the fix once BUG-001/BUG-007 are resolved
- Test suite rounded out: added bulk-create partial-foreign (BUG-001), PATCH ownership
  (BUG-002), a 4-case ownership regression (`it.each` over GET/GET-by-id/DELETE/bulk-delete,
  spying on drizzle-orm's real `eq` to confirm each route still calls
  `eq(accounts.userId, auth.userId)`), and the date-range boundary check (BUG-006, spying on
  the real `lte`). All in `transactions.ownership.test.ts`, mocked-`db` + spied-`drizzle-orm`
  pattern, no live database needed
- **BUG-001 + BUG-002 fixed**: `transactions.ts` POST `/`, POST `/bulk-create`, and PATCH
  `/:id` now verify the `accountId` (and `categoryId`, if set) belongs to `auth.userId`
  before writing, returning 404 otherwise. Mock's `resultQueue` (array, one entry per db
  round-trip) replaced the old single-value mock since these routes now make 2 db calls
  instead of 1. 11/11 tests pass, `tsc --noEmit` and `eslint` both clean
- **BUG-003 fixed**: removed redundant per-route `clerkMiddleware()` calls (and unused
  imports) from `accounts.ts`, `categories.ts`, `transactions.ts`, `summary.ts`, `plaid.ts`
  (scope widened from the original BUG-003 write-up once `summary.ts`/`plaid.ts` were also
  found to have the pattern). Per-handler `getAuth()` null-checks were kept for TS narrowing
  — see the BUG-003 entry in docs/BUGS.md for why.
- **BUG-004 fixed**: added indexes to `db/schema.ts`, generated `drizzle/0006_true_leader.sql`,
  applied it to the live dev DB. Measured honestly with `EXPLAIN ANALYZE` — no visible
  execution-time change at the current ~90-row scale (Postgres correctly prefers Seq Scan
  either way), but confirmed the indexes are real and usable via `SET enable_seqscan = off`.
  Full numbers in docs/BUGS.md BUG-004. Re-measure once there's real data volume.
- Found BUG-019 incidentally: `npm run lint` fails project-wide, pre-existing, unrelated to
  this session's changes (confirmed the actually-touched files lint clean)
- **BUG-006 fixed** in both `transactions.ts` and `summary.ts` (same pattern in both) —
  wrapped the parsed `to` date in date-fns `endOfDay()`. Test flipped from
  documenting-the-bug to asserting-the-fix.
- **BUG-008 + BUG-018 fixed**: `lib/hono.ts`'s `client` and `db/drizzle.ts`'s `sql`/`db` are
  now lazy `Proxy`-wrapped instead of constructed at module scope, so a missing env var only
  fails the call that needed it, not every import. Verified with throwaway scripts (import
  succeeds, only usage throws) AND a smoke test against the **live dev DB** confirming
  `db.select().where()` and `` sql`...` `` still work correctly through the proxy (methods
  are `.bind()`ed to the real instance so `this` doesn't break).
- **BUG-005 fixed**: found real pre-existing duplicate account/category names in the live DB
  while checking before adding the unique constraint. Asked the user how to resolve it; they
  chose merge. Merged 2 account groups + 5 category groups (canonical = row with the most
  attached transactions), re-pointing `transactions` foreign keys inside atomic
  `sql.transaction()` batches, verified zero duplicates remain. Added the
  `UNIQUE (user_id, lower(trim(name)))` index to both tables
  (`drizzle/0007_wild_supreme_intelligence.sql`, applied). `accounts.ts`/`categories.ts`
  `POST /` now catches the unique-violation (code `23505`) and falls back to returning the
  existing row. Verified with a throwaway script that the constraint actually rejects a
  case/whitespace-insensitive duplicate.
- **BUG-007 fixed**: investigated before mutating anything and found the manual-entry path
  stored raw dollars while CSV import (`parseCsvAmount`) already stored cents -- confirmed via
  the live DB's exact ×100 duplicate pairs (e.g. Yandex Go at `-5` and `-500`). Asked the user
  whether the ~90 existing rows were real data; confirmed disposable CSV test data. Cleared
  `transactions` (kept accounts/categories) and re-seeded. Added `convertAmountToCents`/
  `convertAmountFromCents` to `lib/utils.ts` as the single conversion source of truth;
  `formatCurrency` now divides by 100. `insertTransactionSchema.amount` now requires an
  integer. Sheets convert on submit/load. Consolidated `transactions/columns.tsx`'s separate
  (buggy, unformatted) `amountFormatter` into the shared `formatCurrency`, same fix applied
  to the CSV preview table. `seed.ts` now generates cents. Verified: re-ran seed, confirmed
  all 57 resulting rows have `amount % 100 = 0`.
- Found BUG-020 incidentally: `npm run db:seed` references `ts-node`, not a real dependency —
  worked around with `npx tsx scripts/seed.ts` for this session's re-seed.
- Committed: `5256ef0` (initial), `aae89a9` (BUG-001/BUG-002), `f430bff` (BUG-003/BUG-004),
  `3cbdbf8` (BUG-006/BUG-008/BUG-018), `8492bf6` (BUG-005) — the BUG-007 fix is the next
  commit to land
- `.claude/skills/tekshir-finance/SKILL.md` created (invoke as `/tekshir-finance`) —
  project-scoped overseer workflow, adapted from the StudyMate `tekshir` skill to this repo's
  stack (vitest/tsc/eslint, docs/BUGS.md + docs/PLAN.md instead of StudyMate's docs/).
  Named distinctly (not `tekshir`) to avoid ambiguity with the StudyMate skill of that name.
  Also checks uncommitted changes and subagent/Task-tool work, not just git commits.
- **Phase 3 done**: added the "🗂 Indexes" and "🛡 Security" tables plus a "🧩 Key design
  decisions" section to README.md, placed between the existing "🏗 Architecture" and
  "⚙️ Installation" sections, matching the file's plain-line header style (no markdown `#`).
  Every index row and every security-table row was verified against the current code (not
  transcribed from docs/BUGS.md without checking) — read `db/schema.ts`, `accounts.ts`,
  `categories.ts`, `transactions.ts`, `summary.ts`, `app.ts`, and `plaid.ts` directly.
  "Key design decisions" covers money-as-cents (BUG-007, and why cents beat a `decimal`
  column), the `neon-http` no-multi-statement-transactions trade-off, and the no-caching-layer
  decision — the two items docs/BUGS.md's "Deliberately left open" section already documented.
- **BUG-019 fixed**: `components/custom-tooltip.tsx`'s `any` prop replaced with
  `Partial<TooltipContentProps<number, string>>` (Recharts' real type, type-only import);
  `Partial` because the component is instantiated as `<CustomTooltip />` with no props in the
  three chart variants (Recharts injects `active`/`payload` at render time via `cloneElement`).
  The four `formSchema`-only-used-as-a-type warnings (`edit-account-sheet.tsx`,
  `new-account-sheet.tsx`, `edit-category-sheet.tsx`, `new-category-sheet.tsx`) fixed by
  dropping the unused runtime `const formSchema = ...` binding in each and deriving
  `FormValues` directly as `Pick<z.input<typeof insertAccountSchema>, "name">` (or
  `insertCategorySchema`) — the real validation already lives in `AccountForm`/`CategoryForm`,
  which keep their own `formSchema` + `zodResolver`, so no runtime behavior changed.
  `components/data-table.tsx`'s React Compiler warning and
  `features/plaid/api/use-exchange-public-token.ts`'s unused `queryClient` were left as-is,
  exactly as scoped (framework limitation and BUG-009 overlap, respectively).
- **BUG-020 fixed**: `package.json`'s `db:seed` script changed from `ts-node scripts/seed.ts`
  to `tsx scripts/seed.ts`. Not re-run in this session (code-only change, out of scope to
  touch the live DB again here) — already verified working via `npx tsx scripts/seed.ts`
  during the BUG-007 session.
- Verified after all of the above: `npx tsc --noEmit` clean, `npx eslint .` → 0 errors / 2
  warnings (the two explicitly left-as-is), `npx vitest run` → 14/14 passing.
- **BUG-013 fixed**: `db/schema.ts`'s `connectedBanks` table gained `itemId: text("item_id")
  .notNull()`, an index on `userId` (same pattern as `accounts`/`categories`), and a
  `uniqueIndex` on `itemId` (mirrors BUG-005's duplicate-prevention precedent — an Item should
  never be stored twice). Verified the table was empty (0 rows) against the live DB, both
  before generating the migration and again immediately before applying it, so the new
  `NOT NULL` column needed no backfill. `plaid.ts`'s `/exchange-public-token` now captures and
  stores `exchange.data.item_id`. Migration `drizzle/0008_eminent_juggernaut.sql` generated via
  `npx drizzle-kit generate`, applied via `npx drizzle-kit migrate` — applied cleanly.
- **BUG-012 fixed**: added `POST /api/plaid/disconnect` — ownership-scoped select
  (`eq(connectedBanks.userId, auth.userId)`), 404 if the caller has no connected bank, calls
  `client.itemRemove({ access_token })` per row, deletes the row only after `itemRemove`
  succeeds. Added `features/plaid/api/use-disconnect-bank.ts` (mutation hook, same structure as
  `use-exchange-public-token.ts`) and a "Disconnect" button in `settings-card.tsx`, shown in
  place of "Connect" when a bank is connected.
- **BUG-010 fixed**: added `GET /api/plaid/status` — ownership-scoped
  (`eq(connectedBanks.userId, auth.userId)`, `limit(1)`), returns `{ data: { connected: bool
  } }` from `connected_banks` directly (no live Plaid call needed — our own table is the
  source of truth). Added `features/plaid/api/use-get-plaid-status.ts` (`useQuery`, key
  `["plaid-status"]`, same pattern as `use-get-accounts.ts`). `settings-card.tsx`'s hardcoded
  `const connectBank = null;` replaced with this query's result.
- **BUG-009 fixed**: `use-exchange-public-token.ts`'s `onSuccess` TODO replaced with
  `queryClient.invalidateQueries({ queryKey: ["plaid-status"] })` — also naturally resolved the
  BUG-019-documented unused-`queryClient` eslint warning, since the variable is now used.
- New test file `app/api/[[...route]]/plaid.ownership.test.ts` (4 tests): ownership regression
  for `/status` (calls `eq(connectedBanks.userId, "user_me")`, returns the right
  `connected` value both ways) and `/disconnect` (404 + no `itemRemove` call when nothing is
  connected; `itemRemove` called with the right `access_token` plus the ownership `eq` call
  when something is). `plaid`'s `PlaidApi` class is mocked (keeping `Configuration`/
  `PlaidEnvironments`/etc. real via `importOriginal`, since those don't make network calls) so
  no real Plaid API call happens in tests.
- Did **not** touch BUG-011 (transaction sync) scope: no `transactionsSync` call, no
  Plaid-account-to-local-account mapping, no `cursor` column added anywhere — explicitly out of
  scope per this dispatch's instructions.
- Verified after all Plaid changes: `npx tsc --noEmit` clean, `npx vitest run` → 18/18 passing
  (14 pre-existing + 4 new), `npx eslint .` → 0 errors / 1 warning (only the pre-existing
  `data-table.tsx` React Compiler warning remains — the `use-exchange-public-token.ts` warning
  is gone now that BUG-009 is fixed).
- **Reviewed BUG-009/010/012/013 via `/tekshir-finance`**: independently re-ran `tsc`/
  `vitest`/`eslint` (matched the builder's claimed numbers exactly), read every diff across
  all 4 commits in full (schema+migration, backend endpoints, frontend wiring, docs), spot
  checked the ownership-scoping pattern in `plaid.ts` and the test file against
  `transactions.ownership.test.ts`'s established pattern. **Verdict: accepted, no
  deviations.**
- **Dispatched BUG-011 + BUG-014 together** (🔴 opus tier — first implementation of an
  external sync integration) with verified Plaid facts (transactionsSync shape, confirmed
  amount is major-currency-unit not cents, confirmed sign convention is inverted from this
  app's) and pre-made design decisions (account/category mapping via the already-existing,
  previously-unused `plaidId` columns on `accounts`/`categories`; Plaid `transaction_id`
  reused as this app's `transactions.id` for idempotent upserts; nullable `cursor` column on
  `connectedBanks`). **The dispatch failed**: the subagent hit its session usage limit almost
  immediately ("resets 9:50pm Asia/Seoul"). Before failing it produced one real artifact:
  `lib/plaid-mapping.ts` — reviewed, correct, and committed (see below) — but no route
  wiring, no schema change, no tests.
- **Found + fixed BUG-021** while verifying `npm run dev` for the first time this session
  (a "Next" item carried over from earlier): every API route 500'd with `Error: Missing
  Clerk Publishable key`. Root cause: `@hono/clerk-auth` reads a separate
  `CLERK_PUBLISHABLE_KEY` env var (no `NEXT_PUBLIC_` prefix) that was never set — `.env` only
  had the `@clerk/nextjs`-frontend `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` plus an unrelated
  typo'd dead variable (`CLERK_PUBLICABLE_KEY`, missing an "H"). This was invisible to
  `tsc`/`vitest`/`eslint` all session — none of them boot the real server. Fixed `.env`,
  verified `GET /api/accounts` now returns `401` (correct) instead of `500`; `/` and
  `/sign-in` both render `200`.
- **Fixed BUG-014 directly** (not via subagent — small, single-file, no live-DB/Plaid-network
  risk, and the file's "natural" owner, the BUG-011 dispatch, was blocked on the session
  limit): `plaid.ts` now reads `PLAID_ENV`, mapping to `PlaidEnvironments[plaidEnv]`
  (`sandbox`/`production` — checked the installed SDK directly, this version has no
  `development` key), defaulting to `sandbox`. Verified `tsc`/`vitest`/`eslint` clean.
- Committed: `c81a536`/`e4cba7c`/`9dfdc46`/`f172caf` (BUG-009/010/012/013), `1790bae`
  (BUG-021 + salvaged `lib/plaid-mapping.ts`), `48b34ea` (BUG-014), `3575513` (cursor column),
  `a29b2ee` (docs correction).
- **BUG-011 fixed** (retry dispatch, 2026-08-08). Built on the two artifacts the failed first
  attempt left behind — `lib/plaid-mapping.ts` and `connectedBanks.cursor` — neither was
  recreated, no migration regenerated, and `plaid-mapping.ts`'s exported signatures are
  untouched:
  - `POST /api/plaid/sync` (`plaid.ts`): ownership-scoped `connected_banks` select, 404 if the
    caller has nothing connected, then `client.transactionsSync` looped until `has_more` is
    false (bounded at 100 pages), persisting `next_cursor` to `connected_banks.cursor` **after
    every page** rather than once at the end.
  - Account find-or-create on `(user_id, plaid_id)` — the first real use of `accounts.plaid_id`
    — resolved for every account a page references *before* its transactions (account_id is
    NOT NULL). Category find-or-create on `(user_id, plaid_id = personal_finance_category
    .primary)`; an unclassified transaction gets `categoryId: null`, not an invented category.
    Both catch Postgres `23505` from BUG-005's unique-name index and adopt the existing
    same-name row (backfilling its `plaid_id`) instead of 500ing.
  - Upsert via `.onConflictDoUpdate({ target: transactions.id, ... })` — Plaid's
    `transaction_id` is our PK, so re-sync and Plaid's `modified` list are idempotent. `notes`
    excluded from the update set (user-entered; Plaid has nothing to put there).
  - `removed` entries deleted with the id **plus** `inArray(transactions.accountId, <the
    caller's account ids>)` — `transactions` has no `user_id`, so that restriction is the
    ownership guard.
  - Plaid failures (revoked token etc.) return `502` with a clear message instead of an
    unhandled 500.
  - Frontend: `features/plaid/api/use-sync-transactions.ts` + a "Sync transactions" button in
    `settings-card.tsx` next to "Disconnect"; invalidates `["transactions"]`, `["summary"]`,
    `["accounts"]`, `["categories"]`.
  - Tests: `lib/plaid-mapping.test.ts` (13, incl. the sign convention asserted **both** ways —
    Plaid `12.34` → `-1234`, Plaid `-12.34` → `+1234` — and the float-rounding case `8.7` →
    `-870`) and 6 new `/sync` tests in `plaid.ownership.test.ts` (`transactionsSync` mocked
    like `itemRemove`; ownership `eq` calls asserted; sign flip asserted end-to-end through the
    route; cursor replay/per-page persistence; delete scoping; 502-not-500). The mocked `db`
    proxy now records method calls so tests can assert what was written.
  - Verified: `npx tsc --noEmit` clean, `npx vitest run` → **37/37** (18 pre-existing + 19
    new), `npx eslint .` → 0 errors / 1 warning (pre-existing `data-table.tsx`). No live Plaid
    call, no live DB write.
  - Commits: `6c70170` (endpoint), `05c6250` (frontend), `ad44ea1` (tests), plus this docs
    update.

## Not done yet
- `components/data-table.tsx`'s React Compiler "incompatible library" warning
  (`useReactTable()`) — deliberately left open, framework-level limitation, not a code bug
- CV/portfolio text update from "audited" to "fixed" (docs/PLAN.md Phase 3's last item) — not
  actionable from this repo, no CV file exists here

## Next
1. **Review BUG-011** via `/tekshir-finance` (commits `6c70170`, `05c6250`, `ad44ea1` + docs).
2. **End-to-end sanity check against Plaid sandbox** — everything in BUG-011 is proven through
   mocks only (per the dispatch's constraints: no live Plaid call, no live DB write). The
   first real `npm run dev` + Link-a-sandbox-bank + "Sync transactions" run is still untested
   territory; BUG-021's lesson (tsc/vitest/eslint all green while the server was broken)
   applies directly here. Worth watching for: whether sandbox data trips the BUG-005
   unique-name adoption path, and whether `transactions_update_status: NOT_READY` on a
   freshly-linked Item means the first sync legitimately returns zero rows.
3. CV/portfolio text update — outside this repo's scope, needs the user directly.

## Notes
- **History note (2026-08-08, later in the session):** this branch was originally built as a
  disconnected local history (root commit `5256ef0`, unrelated to the real GitHub repo). It
  was later reconciled: rebuilt on top of the actual `origin/master` (root `ec2bea9`) so the
  PR diff is sane instead of "delete the whole repo, add it back." `5256ef0` no longer exists
  in this branch's history — if you see it referenced elsewhere in this file, it's describing
  work from before the reconciliation, still accurate in substance, just not the literal
  commit hash anymore.
- `.env` is filled in with real values (DATABASE_URL, Clerk keys, Plaid keys,
  NEXT_PUBLIC_API_URL). `NEXT_PUBLIC_API_URL` was originally set to the production Vercel URL
  (meaning `npm run dev` would have called the deployed production API instead of the local
  one) — **this has been fixed**; it's `http://localhost:3000` now.

## Open questions for the user
- Confirm the mentor's raw list (mentioning "SkyCode" and "AURUX") was cross-project feedback
  — i.e. not every item was meant for financial-dashboard specifically. One item (access_token
  exposure) was verified not to apply here; worth double-checking nothing else in the original
  list was meant for a different repo.
- Real Neon/Clerk/Plaid credentials needed before DB-touching tests or `npm run dev` can be
  verified end-to-end.
