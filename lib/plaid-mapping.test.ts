import { describe, expect, it } from "vitest";

import {
  mapPlaidTransaction,
  plaidAccountName,
  plaidAmountToCents,
  plaidCategoryKey,
  titleCasePlaidCategory,
  type PlaidTransactionInput,
} from "./plaid-mapping";

// BUG-011 -- the sync endpoint's highest-risk surface is this mapping, and the single
// highest-risk line in it is the amount conversion: Plaid's sign convention is the exact
// inverse of this app's (Plaid: positive = money left the account; this app: negative =
// expense), and Plaid sends major units (dollars) while this app stores cents (BUG-007).
// A sign error here would silently turn every expense into income, so it is asserted in both
// directions explicitly.

const baseTransaction = (
  overrides: Partial<PlaidTransactionInput> = {}
): PlaidTransactionInput => ({
  transaction_id: "txn_1",
  account_id: "plaid_acc_1",
  amount: 12.34,
  date: "2026-08-01",
  name: "SQ *COFFEE BAR",
  ...overrides,
});

describe("plaidAmountToCents (BUG-011 sign convention)", () => {
  it("maps a Plaid purchase (positive) to a negative local amount in cents", () => {
    // $12.34 spent at a shop arrives from Plaid as `12.34`.
    expect(plaidAmountToCents(12.34)).toBe(-1234);
  });

  it("maps a Plaid refund/deposit (negative) to a positive local amount in cents", () => {
    // A $12.34 refund (or an incoming paycheck) arrives from Plaid as `-12.34`.
    expect(plaidAmountToCents(-12.34)).toBe(1234);
  });

  it("rounds to whole cents rather than leaving a float", () => {
    // 8.7 * 100 is 869.9999999999999 in IEEE-754 -- without the Math.round this would be
    // stored as a non-integer and rejected by insertTransactionSchema (BUG-007).
    expect(plaidAmountToCents(8.7)).toBe(-870);
    expect(Number.isInteger(plaidAmountToCents(8.7))).toBe(true);
  });

  it("maps a zero amount to zero", () => {
    // Note: the sign flip makes this literally `-0` in JS. That's a JS curiosity, not a data
    // problem -- it is `=== 0`, serializes as `0` in JSON, and Postgres' integer type has no
    // negative zero. Asserted with `===` rather than `toBe`, which uses Object.is and would
    // distinguish the two.
    expect(plaidAmountToCents(0) === 0).toBe(true);
  });
});

describe("titleCasePlaidCategory", () => {
  it("turns a SCREAMING_SNAKE_CASE primary into user-facing text", () => {
    expect(titleCasePlaidCategory("FOOD_AND_DRINK")).toBe("Food And Drink");
    expect(titleCasePlaidCategory("TRANSPORTATION")).toBe("Transportation");
  });

  it("ignores empty segments from doubled/trailing underscores", () => {
    expect(titleCasePlaidCategory("RENT__AND_UTILITIES_")).toBe("Rent And Utilities");
  });
});

describe("plaidCategoryKey", () => {
  it("returns the personal_finance_category primary when present", () => {
    const transaction = baseTransaction({
      personal_finance_category: {
        primary: "FOOD_AND_DRINK",
        detailed: "FOOD_AND_DRINK_COFFEE",
        confidence_level: "VERY_HIGH",
      },
    });

    expect(plaidCategoryKey(transaction)).toBe("FOOD_AND_DRINK");
  });

  it("returns null when Plaid did not classify the transaction", () => {
    expect(plaidCategoryKey(baseTransaction())).toBeNull();
  });
});

describe("mapPlaidTransaction", () => {
  it("reuses Plaid's transaction_id as the local primary key (idempotent re-sync)", () => {
    const mapped = mapPlaidTransaction(baseTransaction(), {
      accountId: "local_acc_1",
      categoryId: null,
    });

    expect(mapped.id).toBe("txn_1");
  });

  it("maps a purchase onto a negative cents amount end-to-end", () => {
    const mapped = mapPlaidTransaction(baseTransaction({ amount: 12.34 }), {
      accountId: "local_acc_1",
      categoryId: "local_cat_1",
    });

    expect(mapped.amount).toBe(-1234);
    expect(mapped.accountId).toBe("local_acc_1");
    expect(mapped.categoryId).toBe("local_cat_1");
  });

  it("prefers merchant_name for the payee and falls back to the raw name", () => {
    expect(
      mapPlaidTransaction(baseTransaction({ merchant_name: "Coffee Bar" }), {
        accountId: "local_acc_1",
        categoryId: null,
      }).payee
    ).toBe("Coffee Bar");

    expect(
      mapPlaidTransaction(baseTransaction({ merchant_name: null }), {
        accountId: "local_acc_1",
        categoryId: null,
      }).payee
    ).toBe("SQ *COFFEE BAR");
  });

  it("parses Plaid's YYYY-MM-DD date into a Date", () => {
    const mapped = mapPlaidTransaction(baseTransaction({ date: "2026-08-01" }), {
      accountId: "local_acc_1",
      categoryId: null,
    });

    expect(mapped.date).toBeInstanceOf(Date);
    expect(mapped.date.toISOString().startsWith("2026-08-01")).toBe(true);
  });
});

describe("plaidAccountName", () => {
  it("prefers name, then official_name, then a stable fallback", () => {
    expect(
      plaidAccountName({ account_id: "a1", name: "Plaid Checking", official_name: "Official" })
    ).toBe("Plaid Checking");

    expect(
      plaidAccountName({ account_id: "a1", name: "   ", official_name: "Official Checking" })
    ).toBe("Official Checking");

    expect(plaidAccountName({ account_id: "a1", name: null, official_name: null })).toBe(
      "Plaid account a1"
    );
  });
});
