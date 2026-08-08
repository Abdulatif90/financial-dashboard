import type { Transaction as PlaidTransaction } from "plaid";

/**
 * BUG-011 -- pure mapping helpers between Plaid's data model and this app's schema.
 *
 * Kept out of the route file (and free of any `db` / `plaid` runtime imports) so the parts
 * most likely to be silently wrong -- above all the amount sign convention -- can be unit
 * tested directly, with no mocked database and no mocked Plaid client.
 */

/** The subset of Plaid's `Transaction` this app actually maps. */
export type PlaidTransactionInput = Pick<
    PlaidTransaction,
    "transaction_id" | "account_id" | "amount" | "date" | "name"
> &
    Partial<Pick<PlaidTransaction, "merchant_name" | "personal_finance_category">>;

/** A row ready to be inserted into / upserted onto this app's `transactions` table. */
export type MappedTransaction = {
    id: string;
    amount: number;
    payee: string;
    notes: string | null;
    date: Date;
    accountId: string;
    categoryId: string | null;
};

/**
 * `FOOD_AND_DRINK` -> `Food And Drink`. Plaid's personal_finance_category values are
 * SCREAMING_SNAKE_CASE identifiers; this app's `categories.name` is user-facing text.
 */
export const titleCasePlaidCategory = (primary: string): string =>
    primary
        .split("_")
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

/**
 * The `personal_finance_category.primary` value to key a local category off, or `null` when
 * Plaid didn't classify the transaction. `personal_finance_category` is not guaranteed to be
 * present (older items / some institutions omit it), and we deliberately do not invent a
 * category for those -- the transaction just lands with `categoryId: null`.
 */
export const plaidCategoryKey = (transaction: PlaidTransactionInput): string | null =>
    transaction.personal_finance_category?.primary ?? null;

/**
 * Plaid's `amount` is in the MAJOR currency unit (dollars: `12.34` means $12.34) and is
 * POSITIVE when money leaves the account (a purchase) and NEGATIVE when money enters it (a
 * refund/deposit) -- see the `Transaction.amount` doc comment in the `plaid` package.
 *
 * This app's convention is the exact opposite (positive = income, negative = expense; see
 * `scripts/seed.ts`) and stores cents, not dollars (BUG-007). So the mapping is a sign flip
 * *and* a x100: a $12.34 grocery purchase arrives from Plaid as `12.34` and must be stored
 * as `-1234`.
 */
export const plaidAmountToCents = (plaidAmount: number): number =>
    Math.round(-plaidAmount * 100);

/**
 * Maps one Plaid transaction onto this app's `transactions` shape. `accountId`/`categoryId`
 * are the *local* row ids, already resolved (find-or-created) by the caller.
 */
export const mapPlaidTransaction = (
    transaction: PlaidTransactionInput,
    { accountId, categoryId }: { accountId: string; categoryId: string | null }
): MappedTransaction => ({
    // Plaid's transaction_id is used directly as our primary key, which is what makes the
    // sync loop idempotent: re-syncing the same transaction upserts the same row.
    id: transaction.transaction_id,
    amount: plaidAmountToCents(transaction.amount),
    // `merchant_name` is Plaid's cleaned-up merchant, but it's null for transactions with no
    // meaningful merchant (checks, transfers) -- fall back to the raw transaction name.
    payee: transaction.merchant_name ?? transaction.name,
    notes: null,
    // Plaid dates are `YYYY-MM-DD` strings, same as the CSV import path's parsed dates.
    date: new Date(transaction.date),
    accountId,
    categoryId,
});

/** The local `accounts.name` to use for a Plaid account. */
export const plaidAccountName = (account: {
    name?: string | null;
    official_name?: string | null;
    account_id: string;
}): string =>
    account.name?.trim() || account.official_name?.trim() || `Plaid account ${account.account_id}`;
