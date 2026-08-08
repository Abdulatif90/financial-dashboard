# Progress

Live status. Update this at the end of every work session — this file plus git log is what a
new session (or `/tekshir`) reads to resume without re-deriving context. See docs/PLAN.md for
the sequencing and docs/BUGS.md for the full bug list.

## Last updated
2026-08-08 — Phase 3 done: README.md Indexes/Security tables + "Key design decisions" section
added, BUG-019 (`npm run lint`) and BUG-020 (`npm run db:seed`) fixed.

## Current phase
**Phase 3 — Re-audit + README** is done. What's left is the CV/portfolio text update
("audited" -> "fixed") and the deferred Plaid gaps (BUG-009..BUG-014) — see "Next" below.
Phase 0 (foundation), Phase 1 (test infra), and Phase 2 (Priority 1 + Priority 2 bug fixes)
were already done coming into this session.

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

## Not done yet
- `npm run dev` not yet verified locally against real `.env` values
- Plaid gaps (BUG-009..BUG-013), BUG-014 (PLAID_ENV docs mismatch) — deferred, lower priority
  (Phase 2 of docs/PLAN.md treats these as lower priority than core money-tracking)
- `components/data-table.tsx`'s React Compiler "incompatible library" warning
  (`useReactTable()`) — deliberately left open, framework-level limitation, not a code bug
- `features/plaid/api/use-exchange-public-token.ts`'s unused `queryClient` — deliberately left
  open, tied to BUG-009's unfinished query-invalidation TODO (deferred Plaid work)
- CV/portfolio text update from "audited" to "fixed" (docs/PLAN.md Phase 3's last item)

## Next
Phase 3 is complete. What's left, in priority order: (1) verify `npm run dev` locally against
the real `.env` (note: `NEXT_PUBLIC_API_URL` currently points at the production Vercel URL,
not localhost — see "Notes" below), (2) update CV/portfolio text from "audited" to "fixed",
(3) optionally pick up the deferred Plaid work (BUG-009..BUG-014) if it becomes a priority.

## Notes
- `git log`: `5256ef0` — "Initial commit: finance dashboard scaffold + audit tooling" (root
  commit, 2026-08-08). This is the "before" checkpoint Phase 2 fixes diff against.
- `.env` is filled in with real values (DATABASE_URL, Clerk keys, Plaid keys,
  NEXT_PUBLIC_API_URL). One thing worth the user's attention: `NEXT_PUBLIC_API_URL` is set to
  the production Vercel URL, not `http://localhost:3000` — so `npm run dev` locally will call
  the deployed production API, not the local one, until that's changed for local work.

## Open questions for the user
- Confirm the mentor's raw list (mentioning "SkyCode" and "AURUX") was cross-project feedback
  — i.e. not every item was meant for financial-dashboard specifically. One item (access_token
  exposure) was verified not to apply here; worth double-checking nothing else in the original
  list was meant for a different repo.
- Real Neon/Clerk/Plaid credentials needed before DB-touching tests or `npm run dev` can be
  verified end-to-end.
