# Progress

Live status. Update this at the end of every work session — this file plus git log is what a
new session (or `/tekshir`) reads to resume without re-deriving context. See docs/PLAN.md for
the sequencing and docs/BUGS.md for the full bug list.

## Last updated
2026-08-08 — BUG-006, BUG-008, BUG-018 fixed; BUG-005 and BUG-007 blocked on a user decision

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
- **BUG-005 investigation found a live blocker**: checked the dev DB for existing duplicate
  account/category names before adding the unique constraint (good instinct — a migration
  against violating data would just fail) and found real duplicates already exist. Stopped
  and documented rather than picking a merge strategy unilaterally.
- Committed: `5256ef0` (initial), `aae89a9` (BUG-001/BUG-002), `f430bff` (BUG-003/BUG-004) —
  the BUG-006/BUG-008/BUG-018 fix is the next commit to land
- `.claude/skills/tekshir-finance/SKILL.md` created (invoke as `/tekshir-finance`) —
  project-scoped overseer workflow, adapted from the StudyMate `tekshir` skill to this repo's
  stack (vitest/tsc/eslint, docs/BUGS.md + docs/PLAN.md instead of StudyMate's docs/).
  Named distinctly (not `tekshir`) to avoid ambiguity with the StudyMate skill of that name.
  Also checks uncommitted changes and subagent/Task-tool work, not just git commits.

## Not done yet — two Priority 2 items are blocked, need the user to decide
- **BUG-005 (unique constraint) is blocked**: the live dev DB already has real duplicate
  account/category names for one user (found while checking before adding the constraint —
  see docs/BUGS.md BUG-005 for the exact rows). A unique index migration will fail against
  existing violations. Fixing this means merging or renaming those duplicates first, which
  deletes rows and rewires `transactions` foreign keys — **not done without the user picking
  an approach** (merge into a canonical row vs. rename in place).
- **BUG-007 (money as cents) not started**: same category of concern — the live DB already
  has ~90 real transaction rows stored as whole-dollar integers. Converting the semantic
  meaning to cents requires either a one-time `UPDATE ... SET amount = amount * 100` against
  live data, or a more careful expand-contract with a second column. Either mutates real
  stored financial values — **flagging before touching it, not assuming "davom et" covers
  mutating stored money values.**
- BUG-019 (found incidentally): `npm run lint` fails project-wide (1 error, 6 warnings) in
  files this session never touched — not fixed, out of scope
- `npm run dev` not yet verified locally against real `.env` values
- Plaid gaps (BUG-009..BUG-013), BUG-014 (PLAID_ENV docs mismatch) — deferred, lower priority

## Next
Waiting on the user for BUG-005 and BUG-007 (see above). Everything else fixable without
touching live data is done through BUG-018.

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
