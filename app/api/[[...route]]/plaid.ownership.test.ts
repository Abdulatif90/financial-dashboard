import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectedBanks } from "@/db/schema";

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

vi.mock("plaid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("plaid")>();
  return {
    ...actual,
    PlaidApi: vi.fn().mockImplementation(function PlaidApiMock(this: { itemRemove: typeof itemRemoveMock }) {
      this.itemRemove = itemRemoveMock;
    }),
  };
});

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
  };
});

vi.mock("@hono/clerk-auth", () => ({
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

const { default: plaidApp } = await import("./plaid");
const { eq: eqImport } = await import("drizzle-orm");
const eqMock = vi.mocked(eqImport);

beforeEach(() => {
  eqMock.mockClear();
  itemRemoveMock.mockClear();
  itemRemoveMock.mockResolvedValue({ data: { request_id: "req_1" } });
  resultQueue = [];
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
