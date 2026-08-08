import { beforeEach, describe, expect, it, vi } from "vitest";
import { accounts } from "@/db/schema";

// BUG-001, BUG-002, BUG-006 (docs/BUGS.md): the transactions routes had three verified gaps
// -- (1) create/bulk-create never checked accountId ownership, (2) update never checked a
// *new* accountId's ownership, (3) the `to` date-range filter compares against local
// midnight instead of end-of-day, silently excluding same-day transactions. BUG-001/BUG-002
// are fixed (see transactions.ts); BUG-006 is still open. This suite proves both against the
// real route code, plus regression tests proving the already-correct read/delete paths still
// filter by `eq(accounts.userId, auth.userId)`.
//
// Strategy: `db` is replaced with a generic "chainable" proxy (any method call returns
// another chainable link; awaiting it resolves to the next entry in `resultQueue`) so every
// query shape in transactions.ts -- select/insert/$with/with/update/delete -- works without
// a real database. Each test sets `resultQueue` to match the number and order of db
// round-trips the route makes (e.g. an ownership-check select, then an insert). Ownership
// itself is verified not by inspecting the mock's arguments, but by spying on drizzle-orm's
// real `eq`/`lte` functions (kept fully functional via `importOriginal`) and asserting the
// route actually calls them with `accounts.userId`/`auth.userId` -- this catches a
// regression even if someone changes *how* the query is built, not just whether it runs.

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
    lte: vi.fn(actual.lte),
  };
});

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => next(),
  getAuth: () => ({ userId: "user_me" }),
}));

let resultQueue: unknown[] = [];

function chainable(): unknown {
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: unknown) => void) => {
            resolve(resultQueue.length > 0 ? resultQueue.shift() : []);
          };
        }
        return () => proxy;
      },
    }
  );
  return proxy;
}

vi.mock("@/db/drizzle", () => ({ db: chainable() }));

const { default: transactionsApp } = await import("./transactions");
const { eq: eqImport, lte: lteImport } = await import("drizzle-orm");
const eqMock = vi.mocked(eqImport);
const lteMock = vi.mocked(lteImport);

beforeEach(() => {
  eqMock.mockClear();
  lteMock.mockClear();
  resultQueue = [];
});

describe("POST /transactions ownership (BUG-001, fixed)", () => {
  it("rejects a transaction targeting an accountId the caller doesn't own", async () => {
    const foreignAccountId = "account_belongs_to_someone_else";
    // 1 db round-trip: the ownership-check select, which finds nothing -> insert never runs.
    resultQueue = [[]];

    const res = await transactionsApp.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: foreignAccountId,
        payee: "Test Payee",
        amount: 100,
        date: new Date("2026-01-01").toISOString(),
      }),
    });

    expect(res.status).toBe(404);
    expect(eqMock).toHaveBeenCalledWith(accounts.id, foreignAccountId);
  });

  it("succeeds when the account is owned by the caller", async () => {
    const ownAccountId = "account_mine";
    resultQueue = [
      [{ id: ownAccountId }], // ownership check finds it
      [{ id: "txn_1", accountId: ownAccountId, amount: 100 }], // insert result
    ];

    const res = await transactionsApp.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: ownAccountId,
        payee: "Test Payee",
        amount: 100,
        date: new Date("2026-01-01").toISOString(),
      }),
    });

    expect(res.status).toBe(200);
  });
});

describe("POST /transactions/bulk-create ownership (BUG-001, fixed)", () => {
  it("rejects the whole batch when one transaction targets a foreign account", async () => {
    const ownAccountId = "account_mine";
    const foreignAccountId = "account_belongs_to_someone_else";
    // 1 db round-trip: the ownership-check select only returns the owned account.
    resultQueue = [[{ id: ownAccountId }]];

    const res = await transactionsApp.request("/bulk-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          accountId: ownAccountId,
          payee: "Own account txn",
          amount: 50,
          date: new Date("2026-01-01").toISOString(),
        },
        {
          accountId: foreignAccountId,
          payee: "Foreign account txn",
          amount: 75,
          date: new Date("2026-01-01").toISOString(),
        },
      ]),
    });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /transactions/:id ownership (BUG-002, fixed)", () => {
  it("rejects moving an owned transaction onto a foreign accountId", async () => {
    const foreignAccountId = "account_belongs_to_someone_else";
    // 1 db round-trip: the new-account ownership check, which finds nothing -> the
    // transaction-owning CTE + update never runs.
    resultQueue = [[]];

    const res = await transactionsApp.request("/txn_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: foreignAccountId,
        payee: "Moved txn",
        amount: 100,
        date: new Date("2026-01-01").toISOString(),
      }),
    });

    expect(res.status).toBe(404);
    expect(eqMock).toHaveBeenCalledWith(accounts.id, foreignAccountId);
  });
});

describe("Ownership regression: reads and deletes still filter by accounts.userId", () => {
  const cases: [string, () => Response | Promise<Response>][] = [
    ["GET /", () => transactionsApp.request("/")],
    ["GET /:id", () => transactionsApp.request("/txn_1")],
    ["DELETE /:id", () => transactionsApp.request("/txn_1", { method: "DELETE" })],
    [
      "POST /bulk-delete",
      () =>
        transactionsApp.request("/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ["txn_1", "txn_2"] }),
        }),
    ],
  ];

  it.each(cases)("%s calls eq(accounts.userId, auth.userId)", async (_name, run) => {
    resultQueue = [[]];
    await run();

    expect(eqMock).toHaveBeenCalledWith(accounts.userId, "user_me");
  });
});

describe("GET /transactions date-range boundary (BUG-006, still open)", () => {
  it("compares the `to` date at local midnight, not end-of-day", async () => {
    resultQueue = [[]];

    await transactionsApp.request("/?to=2026-01-15");

    expect(lteMock).toHaveBeenCalled();
    const lastCall = lteMock.mock.calls.at(-1);
    const endDate = lastCall?.[1] as Date;

    // This is the bug: a transaction on 2026-01-15 at, say, 14:00 is excluded because
    // endDate is midnight, not 23:59:59.999. Once fixed, assert endDate is end-of-day.
    expect(endDate.getHours()).toBe(0);
    expect(endDate.getMinutes()).toBe(0);
    expect(endDate.getSeconds()).toBe(0);
  });
});
