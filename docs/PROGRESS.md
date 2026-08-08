# Progress

Live status. Update this at the end of every work session — this file plus git log is what a
new session (or `/tekshir`) reads to resume without re-deriving context. See docs/PLAN.md for
the sequencing and docs/BUGS.md for the full bug list.

## Last updated
2026-08-08 — BUG-001 + BUG-002 fixed

## Current phase
**Phase 2 — Fix bugs, in priority order** (see docs/PLAN.md). Phase 0 (foundation) and Phase 1
(test infra) are done.

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
- Committed: `5256ef0` (initial) — the BUG-001/BUG-002 fix + expanded test suite is the next
  commit to land
- `.claude/skills/tekshir-finance/SKILL.md` created (invoke as `/tekshir-finance`) —
  project-scoped overseer workflow, adapted from the StudyMate `tekshir` skill to this repo's
  stack (vitest/tsc/eslint, docs/BUGS.md + docs/PLAN.md instead of StudyMate's docs/).
  Named distinctly (not `tekshir`) to avoid ambiguity with the StudyMate skill of that name.
  Also checks uncommitted changes and subagent/Task-tool work, not just git commits.

## Not done yet
- BUG-003 (redundant per-route `clerkMiddleware()`), BUG-004 (missing indexes) — the rest of
  Priority 1
- BUG-005 through BUG-008 — Priority 2
- BUG-006 test still documents the bug (asserts midnight), not the fix — still open
- BUG-007 test still documents the bug (schema accepts fractional amounts) — still open
- `npm run dev` not yet verified locally against real `.env` values
- Plaid gaps (BUG-009..BUG-013), BUG-014 (PLAID_ENV docs mismatch) — deferred, lower priority
  per docs/PLAN.md

## Next
1. BUG-003 — drop the redundant per-route `clerkMiddleware()` + `!auth.userId` checks in
   `accounts.ts`, `categories.ts`, `transactions.ts` (app-level guard in `app.ts` already
   covers this)
2. BUG-004 — add indexes (`accounts.userId`, `categories.userId`,
   `transactions(accountId, date)`, `transactions.categoryId`), generate a migration, measure
   with `EXPLAIN ANALYZE` before/after

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
