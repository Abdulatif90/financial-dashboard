# Plan

Sequenced work for financial-dashboard, from "audit story" to "fixed" (see docs/BUGS.md for
the bug list this plan works through, docs/PROGRESS.md for live status).

## Phase 0 — Foundation (blocking everything else) — done
- [x] `.env` created with required keys blank (BUG-016) — **user fills in real values**
- [x] User fills in `.env` values (DATABASE_URL, Clerk keys, Plaid keys, NEXT_PUBLIC_API_URL)
- [x] First git commit — checkpoint the current scaffold before any fixes land, so "before"
      is preserved for the audit story / CV diff
- [x] `npm run dev` confirmed working locally against real `.env` (also surfaced BUG-021,
      the missing `CLERK_PUBLISHABLE_KEY` env var -- see docs/BUGS.md)

## Phase 1 — Test infrastructure — done
- [x] Install vitest (+ `@vitest/coverage-v8` optional), add `vitest.config.ts`, add
      `"test": "vitest run"` / `"test:watch": "vitest"` to package.json scripts
- [x] First suite: transaction ownership/IDOR tests (mocked `db`, no live DB needed) — see
      docs/BUGS.md BUG-001/BUG-002 and the test list below
- [x] Run the suite. BUG-001/BUG-002 tests failed red initially (proving the bugs), now flipped
      to assert the fix — all 38 tests across 4 files pass
- [x] New bugs a test surfaced were appended to docs/BUGS.md with the next BUG-0xx number, in
      the priority section matching severity, before moving on

### Tier 3 test list (from the mentor's review, verified relevant to this codebase)
```
POST   /transactions      foreign accountId                 -> 404      (BUG-001)
PATCH  /transactions/:id  moved to a foreign accountId       -> 404      (BUG-002)
bulk-create                1 of N transactions is foreign     -> whole request rejected
GET    /transactions                                          -> only caller's rows
DELETE / bulk-delete                                           -> only ever touch caller's rows
amount = 12.34                                                 -> converts to cents or rejected, never truncated silently (BUG-007)
transaction at 23:59 on the `to` date of a range filter        -> included in results (BUG-006)
```
~7 tests. Coverage % is not the goal here — these specific tests are, because they're the
ones that prove the fixes in Phase 2 actually work.

## Phase 2 — Fix bugs, in BUGS.md priority order
1. Priority 1 (BUG-001 .. BUG-004) — cheap, highest impact, do these first
2. Priority 2 (BUG-005 .. BUG-008)
3. Plaid gaps (BUG-009 .. BUG-013) — lower priority than P1/P2 since Plaid is an optional
   integration, not core money-tracking
4. BUG-014 (PLAID_ENV docs mismatch) — trivial, batch with whichever Plaid fix lands first

For each bug: fix -> the corresponding test (if one exists) goes green -> mark 🟢 Fixed in
docs/BUGS.md with the date -> commit.

## Phase 3 — Re-audit + README
- [x] Re-run the full test suite + `npx tsc --noEmit` + `npm run lint` (14/14 tests, tsc
      clean, lint now 0 errors / 2 warnings — see BUG-019)
- [x] Add the two tables the mentor's review asked for, to README.md, once there's something
      real to put in them (not before — a table of indexes that don't exist yet is fiction):
      - **Indexes table**: index -> which query it covers
      - **Security table**: concern -> implementation
- [x] Add a "Key design decisions" section to README.md with trade-offs, including the two
      deliberately-open items from docs/BUGS.md (neon-http transactions, no cache layer)
- [x] BUG-019 (`npm run lint`) and BUG-020 (`npm run db:seed`) fixed as part of this phase
- [ ] Update CV/portfolio text from "audited" to "fixed" once Phase 2 is actually done — not
      before

## Ongoing
- `/tekshir-finance` (project-scoped skill, `.claude/skills/tekshir-finance/SKILL.md`) reviews
  commits since the last docs/PROGRESS.md update against this plan and docs/BUGS.md, runs the
  checks, and produces a ready-to-paste prompt for whichever session does the actual fixing.
- docs/PROGRESS.md is updated at the end of every work session — that's what makes it
  possible to resume after a dropped session without re-deriving all of this context.
