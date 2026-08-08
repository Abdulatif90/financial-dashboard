import { beforeEach, describe, expect, it, vi } from "vitest";
import { accounts, categories, connectedBanks, transactions } from "@/db/schema";

// BUG-012 (disconnect flow), BUG-010 (real connection status) -- both new endpoints filter
// connected_banks by the caller's userId, following the same ownership pattern already used
// throughout accounts.ts/categories.ts/transactions.ts. This suite proves that pattern is
// actually wired up, not just present in the code.
//
// Strategy mirrors transactions.ownership.test.ts: `db` is replaced with a generic
// "chainable" proxy (any method call returns another chainable link; awaiting it resolves to
// the next entry in `resultQueue`), `@hono/clerk-auth`'s `getAuth` is mocked to a fixed user,
// and drizzle-orm's real `eq` is spied on (via `importOriginal`) so the tests assert the route
// actually calls `eq(connectedBanks.userId, "user_me")`, not just that *some* query runs.
// Plaid's `PlaidApi` is mocked too (keeping `Configuration`/`PlaidEnvironments`/etc. real via
// `importOriginal`, since those don't make network calls) so `itemRemove` never hits Plaid's
// real API.

const itemRemoveMock = vi.fn().mockResolvedValue({ data: { request_id: "req_1" } });
// BUG-011: /sync's Plaid call. Mocked for the same reason as itemRemove -- no test may ever
// hit Plaid's real API.
const transactionsSyncMock = vi.fn();

vi.mock("plaid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("plaid")>();
  return {
    ...actual,
    PlaidApi: vi.fn().mockImplementation(function PlaidApiMock(this: {
      itemRemove: typeof itemRemoveMock;
      transactionsSync: typeof transactionsSyncMock;
    }) {
      this.itemRemove = itemRemoveMock;
      this.transactionsSync = transactionsSyncMock;
    }),
  };
});

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
    inArray: vi.fn(actual.inArray),
  };
});

vi.mock("@hono/clerk-auth", () => ({
  getAuth: () => ({ userId: "user_me" }),
}));

let resultQueue: unknown[] = [];
// Every method call made on the mocked `db`, in order, so a test can assert *what* was
// written (e.g. the sign of the amount handed to `.values()`), not just that a write happened.
let dbCalls: { method: string; args: unknown[] }[] = [];

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
        return (...args: unknown[]) => {
          dbCalls.push({ method: String(prop), args });
          return proxy;
        };
      },
    }
  );
  return proxy;
}

vi.mock("@/db/drizzle", () => ({ db: chainable() }));

const { default: plaidApp } = await import("./plaid");
const { eq: eqImport, inArray: inArrayImport } = await import("drizzle-orm");
const eqMock = vi.mocked(eqImport);
const inArrayMock = vi.mocked(inArrayImport);

beforeEach(() => {
  eqMock.mockClear();
  inArrayMock.mockClear();
  itemRemoveMock.mockClear();
  itemRemoveMock.mockResolvedValue({ data: { request_id: "req_1" } });
  transactionsSyncMock.mockReset();
  resultQueue = [];
  dbCalls = [];
});

/** The `.values(...)` payload of the first `db.insert(<table>)` chain in this request. */
const insertedValuesFor = (table: unknown): Record<string, unknown> | undefined => {
  const insertIndex = dbCalls.findIndex(
    (call) => call.method === "insert" && call.args[0] === table
  );

  if (insertIndex === -1) {
    return undefined;
  }

  const valuesCall = dbCalls.slice(insertIndex + 1).find((call) => call.method === "values");
  return valuesCall?.args[0] as Record<string, unknown> | undefined;
};

const syncPage = (overrides: Record<string, unknown> = {}) => ({
  data: {
    accounts: [],
    added: [],
    modified: [],
    removed: [],
    next_cursor: "cursor-1",
    has_more: false,
    transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
    request_id: "req_1",
    ...overrides,
  },
});

const connectedBankRow = (overrides: Record<string, unknown> = {}) => ({
  id: "bank_1",
  userId: "user_me",
  accessToken: "access-sandbox-1",
  itemId: "item-1",
  cursor: null,
  ...overrides,
});

describe("GET /plaid/status ownership (BUG-010)", () => {
  it("scopes the lookup to the caller's userId and reports connected: false when no row exists", async () => {
    resultQueue = [[]];

    const res = await plaidApp.request("/status");

    expect(res.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith(connectedBanks.userId, "user_me");
    const body = await res.json();
    expect(body).toEqual({ data: { connected: false } });
  });

  it("reports connected: true when a row exists for the caller", async () => {
    resultQueue = [[{ id: "bank_1" }]];

    const res = await plaidApp.request("/status");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { connected: true } });
  });
});

describe("POST /plaid/disconnect ownership (BUG-012)", () => {
  it("scopes the lookup to the caller's userId and returns 404 when no bank is connected", async () => {
    resultQueue = [[]];

    const res = await plaidApp.request("/disconnect", { method: "POST" });

    expect(res.status).toBe(404);
    expect(eqMock).toHaveBeenCalledWith(connectedBanks.userId, "user_me");
    expect(itemRemoveMock).not.toHaveBeenCalled();
  });

  it("calls itemRemove and deletes the row when a bank is connected", async () => {
    resultQueue = [
      [{ id: "bank_1", userId: "user_me", accessToken: "access-sandbox-1", itemId: "item-1" }], // ownership-scoped select
      [], // delete result (unused)
    ];

    const res = await plaidApp.request("/disconnect", { method: "POST" });

    expect(res.status).toBe(200);
    expect(itemRemoveMock).toHaveBeenCalledWith({ access_token: "access-sandbox-1" });
    expect(eqMock).toHaveBeenCalledWith(connectedBanks.userId, "user_me");
    const body = await res.json();
    expect(body).toEqual({ data: { connected: false } });
  });
});

describe("POST /plaid/sync ownership (BUG-011)", () => {
  it("scopes the connected-bank lookup to the caller and 404s (without calling Plaid) when nothing is connected", async () => {
    resultQueue = [[]];

    const res = await plaidApp.request("/sync", { method: "POST" });

    expect(res.status).toBe(404);
    expect(eqMock).toHaveBeenCalledWith(connectedBanks.userId, "user_me");
    expect(transactionsSyncMock).not.toHaveBeenCalled();
  });

  it("find-or-creates the account and category scoped to the caller, and upserts the transaction with a sign-flipped cents amount", async () => {
    resultQueue = [
      [connectedBankRow()], // ownership-scoped connected_banks select
      // everything after this defaults to [] -> account lookup miss, category lookup miss
    ];

    transactionsSyncMock.mockResolvedValueOnce(
      syncPage({
        accounts: [
          { account_id: "plaid_acc_1", name: "Plaid Checking", official_name: null, mask: "0000" },
        ],
        added: [
          {
            transaction_id: "plaid_txn_1",
            account_id: "plaid_acc_1",
            amount: 12.34, // Plaid: positive = money LEFT the account (a purchase)
            date: "2026-08-01",
            name: "SQ *COFFEE BAR",
            merchant_name: "Coffee Bar",
            personal_finance_category: {
              primary: "FOOD_AND_DRINK",
              detailed: "FOOD_AND_DRINK_COFFEE",
            },
          },
        ],
      })
    );

    const res = await plaidApp.request("/sync", { method: "POST" });

    expect(res.status).toBe(200);
    expect(transactionsSyncMock).toHaveBeenCalledWith({
      access_token: "access-sandbox-1",
      cursor: undefined, // never synced before -> full history
    });

    // Ownership scoping on every table this route touches.
    expect(eqMock).toHaveBeenCalledWith(connectedBanks.userId, "user_me");
    expect(eqMock).toHaveBeenCalledWith(accounts.userId, "user_me");
    expect(eqMock).toHaveBeenCalledWith(accounts.plaidId, "plaid_acc_1");
    expect(eqMock).toHaveBeenCalledWith(categories.userId, "user_me");
    expect(eqMock).toHaveBeenCalledWith(categories.plaidId, "FOOD_AND_DRINK");

    // Newly created local rows carry the caller's userId, never anyone else's.
    expect(insertedValuesFor(accounts)).toMatchObject({
      userId: "user_me",
      plaidId: "plaid_acc_1",
      name: "Plaid Checking",
    });
    expect(insertedValuesFor(categories)).toMatchObject({
      userId: "user_me",
      plaidId: "FOOD_AND_DRINK",
      name: "Food And Drink",
    });

    // THE sign check, end-to-end through the route: a $12.34 Plaid purchase must land as
    // -1234 cents (this app's expense convention), not +1234 and not 12.34.
    expect(insertedValuesFor(transactions)).toMatchObject({
      id: "plaid_txn_1",
      amount: -1234,
      payee: "Coffee Bar",
    });

    // The cursor is persisted, also ownership-scoped.
    expect(eqMock).toHaveBeenCalledWith(connectedBanks.id, "bank_1");

    const body = await res.json();
    expect(body).toEqual({
      data: { added: 1, modified: 0, removed: 0, accountsCreated: 1, categoriesCreated: 1 },
    });
  });

  it("maps a Plaid refund (negative amount) to a positive local amount", async () => {
    resultQueue = [[connectedBankRow()]];

    transactionsSyncMock.mockResolvedValueOnce(
      syncPage({
        accounts: [
          { account_id: "plaid_acc_1", name: "Plaid Checking", official_name: null, mask: "0000" },
        ],
        added: [
          {
            transaction_id: "plaid_txn_refund",
            account_id: "plaid_acc_1",
            amount: -12.34, // Plaid: negative = money ENTERED the account
            date: "2026-08-02",
            name: "REFUND",
          },
        ],
      })
    );

    const res = await plaidApp.request("/sync", { method: "POST" });

    expect(res.status).toBe(200);
    expect(insertedValuesFor(transactions)).toMatchObject({
      amount: 1234,
      // uncategorized by Plaid -> no invented category
      categoryId: null,
    });

    const body = await res.json();
    expect(body).toEqual({
      data: { added: 1, modified: 0, removed: 0, accountsCreated: 1, categoriesCreated: 0 },
    });
  });

  it("replays the stored cursor and keeps paging until has_more is false, persisting after each page", async () => {
    resultQueue = [[connectedBankRow({ cursor: "cursor-0" })]];

    transactionsSyncMock
      .mockResolvedValueOnce(syncPage({ next_cursor: "cursor-1", has_more: true }))
      .mockResolvedValueOnce(syncPage({ next_cursor: "cursor-2", has_more: false }));

    const res = await plaidApp.request("/sync", { method: "POST" });

    expect(res.status).toBe(200);
    expect(transactionsSyncMock).toHaveBeenCalledTimes(2);
    expect(transactionsSyncMock).toHaveBeenNthCalledWith(1, {
      access_token: "access-sandbox-1",
      cursor: "cursor-0",
    });
    expect(transactionsSyncMock).toHaveBeenNthCalledWith(2, {
      access_token: "access-sandbox-1",
      cursor: "cursor-1",
    });

    // One cursor write per page, not one at the very end.
    const cursorWrites = dbCalls.filter(
      (call) => call.method === "set" && (call.args[0] as { cursor?: string })?.cursor
    );
    expect(cursorWrites.map((call) => (call.args[0] as { cursor: string }).cursor)).toEqual([
      "cursor-1",
      "cursor-2",
    ]);
  });

  it("only deletes removed transactions that belong to the caller's own accounts", async () => {
    resultQueue = [
      [connectedBankRow()], // connected_banks select
      [{ id: "local_acc_1" }], // the caller's account ids (delete scope)
      [{ id: "plaid_txn_gone" }], // delete ... returning
    ];

    transactionsSyncMock.mockResolvedValueOnce(
      syncPage({
        removed: [{ transaction_id: "plaid_txn_gone", account_id: "plaid_acc_1" }],
      })
    );

    const res = await plaidApp.request("/sync", { method: "POST" });

    expect(res.status).toBe(200);
    expect(eqMock).toHaveBeenCalledWith(accounts.userId, "user_me");
    expect(eqMock).toHaveBeenCalledWith(transactions.id, "plaid_txn_gone");
    // The delete is restricted to accounts the caller owns -- a foreign transaction_id can't
    // delete another user's row.
    expect(inArrayMock).toHaveBeenCalledWith(transactions.accountId, ["local_acc_1"]);

    const body = await res.json();
    expect(body).toEqual({
      data: { added: 0, modified: 0, removed: 1, accountsCreated: 0, categoriesCreated: 0 },
    });
  });

  it("returns a clear error instead of an unhandled 500 when Plaid rejects the access token", async () => {
    resultQueue = [[connectedBankRow()]];

    transactionsSyncMock.mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 400"), {
        response: { data: { error_code: "ITEM_LOGIN_REQUIRED" } },
      })
    );

    const res = await plaidApp.request("/sync", { method: "POST" });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to sync transactions with Plaid" });
  });
});
