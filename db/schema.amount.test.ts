import { describe, expect, it } from "vitest";
import { insertTransactionSchema } from "@/db/schema";
import { convertAmountFromCents, convertAmountToCents, formatCurrency } from "@/lib/utils";

// BUG-007 (docs/BUGS.md): amount is stored as `integer("amount")` cents. The schema now
// rejects any non-integer amount reaching it (the client is responsible for converting
// entered dollars to cents before submitting), and lib/utils.ts's convert*/formatCurrency
// helpers are the single source of truth for the *100 / /100 conversion.
describe("insertTransactionSchema amount validation (BUG-007, fixed)", () => {
  // Routes validate with `insertTransactionSchema.omit({ id: true })` (see transactions.ts),
  // matching that usage here rather than testing the raw schema which still requires `id`.
  const schema = insertTransactionSchema.omit({ id: true });
  const base = {
    accountId: "account_1",
    payee: "Coffee Shop",
    date: new Date("2026-01-01"),
    notes: null,
  };

  it("rejects a non-integer amount instead of silently accepting fractional cents", () => {
    const result = schema.safeParse({ ...base, amount: 12.34 });
    expect(result.success).toBe(false);
  });

  it("accepts whole-cent amounts", () => {
    const result = schema.safeParse({ ...base, amount: 1234 });
    expect(result.success).toBe(true);
  });
});

describe("convertAmountToCents / convertAmountFromCents / formatCurrency", () => {
  it("converts a fractional dollar amount to whole cents", () => {
    expect(convertAmountToCents(12.34)).toBe(1234);
    expect(convertAmountToCents(-5)).toBe(-500);
    expect(convertAmountToCents(0.1)).toBe(10);
  });

  it("round-trips cents back to the original dollar amount", () => {
    expect(convertAmountFromCents(1234)).toBe(12.34);
    expect(convertAmountFromCents(-500)).toBe(-5);
  });

  it("formats a cents amount as a dollar currency string", () => {
    expect(formatCurrency(1234)).toBe("$12.34");
    expect(formatCurrency(-500)).toBe("-$5.00");
  });
});
