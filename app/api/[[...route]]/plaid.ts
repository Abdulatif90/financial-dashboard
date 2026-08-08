import { Hono } from "hono";
import { Configuration, PlaidEnvironments, PlaidApi, Products, CountryCode } from "plaid";
import { getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { accounts, categories, connectedBanks, transactions } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import {
    mapPlaidTransaction,
    plaidAccountName,
    plaidCategoryKey,
    titleCasePlaidCategory,
    type PlaidTransactionInput,
} from "@/lib/plaid-mapping";

// BUG-014: PLAID_ENV was documented (README, .env) but never read -- basePath was hardcoded
// to sandbox regardless of the env var's value. The installed `plaid` SDK only exposes
// `sandbox` and `production` in PlaidEnvironments (verified: node_modules/plaid/dist/
// configuration.js -- no `development` key in this version).
const plaidEnv = process.env.PLAID_ENV === "production" ? "production" : "sandbox";

const configuration = new Configuration({
    basePath: PlaidEnvironments[plaidEnv],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
            "PLAID-SECRET": process.env.PLAID_SECRET!,
        },
    },
});

const client = new PlaidApi(configuration);


const app = new Hono()
.post(
    "/create-link-token",
    async (c) => {
        const auth = getAuth(c);
        if (!auth?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const token = await client.linkTokenCreate({
            user: {
                client_user_id: auth.userId,    
            },
            client_name: "Financial Dashboard",
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: "en",
        });

        return c.json({ data: token.data.link_token }, 200);
    }
)
.post(
    "/exchange-public-token",
    zValidator(
        "json",
        z.object({
            publicToken: z.string(),
        }),
    ),
    async (c) => {
        const auth = getAuth(c);
        const { publicToken } = c.req.valid("json");

         if (!auth?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const exchange = await client.itemPublicTokenExchange({
            public_token: publicToken,
        });

        await db
         .insert(connectedBanks)
         .values({
            id: createId(),
            userId: auth.userId,
            accessToken: exchange.data.access_token,
            // BUG-013: item_id is needed for item management (disconnect via itemRemove,
            // future webhook/sync-cursor work) -- previously discarded.
            itemId: exchange.data.item_id,
         });

        // Never return the Plaid access_token to the client -- it's a long-lived credential
        // that grants read access to the user's linked financial accounts. The original
        // origin/master had this leak (`exchange.data.access_token` in the response); fixed
        // here as part of reconciling onto the real base.
        return c.json({ data: { connected: true } }, 200);
    }
)
.get(
    "/status",
    async (c) => {
        const auth = getAuth(c);

        if (!auth?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        // BUG-010: our own connected_banks table is the source of truth for whether *we*
        // consider the user connected -- no need to call Plaid's API just to check this.
        const [row] = await db
            .select({ id: connectedBanks.id })
            .from(connectedBanks)
            .where(eq(connectedBanks.userId, auth.userId))
            .limit(1);

        return c.json({ data: { connected: Boolean(row) } }, 200);
    }
)
.post(
    "/disconnect",
    async (c) => {
        const auth = getAuth(c);

        if (!auth?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const rows = await db
            .select()
            .from(connectedBanks)
            .where(eq(connectedBanks.userId, auth.userId));

        if (rows.length === 0) {
            return c.json({ error: "No connected bank found" }, 404);
        }

        for (const row of rows) {
            await client.itemRemove({ access_token: row.accessToken });

            await db
                .delete(connectedBanks)
                .where(eq(connectedBanks.id, row.id));
        }

        return c.json({ data: { connected: false } }, 200);
    }
)
.post(
    "/sync",
    async (c) => {
        const auth = getAuth(c);

        if (!auth?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const userId = auth.userId;

        // Ownership scoping: only ever sync Items belonging to the caller.
        const banks = await db
            .select()
            .from(connectedBanks)
            .where(eq(connectedBanks.userId, userId));

        if (banks.length === 0) {
            return c.json({ error: "No connected bank found" }, 404);
        }

        const summary = {
            added: 0,
            modified: 0,
            removed: 0,
            accountsCreated: 0,
            categoriesCreated: 0,
        };

        // Per-request caches so a page with 200 transactions across 3 accounts does 3 account
        // lookups, not 200.
        const localAccountIdByPlaidId = new Map<string, string>();
        const localCategoryIdByPlaidKey = new Map<string, string>();

        /**
         * Find-or-create the local `accounts` row for a Plaid account. Both the lookup and the
         * insert are scoped to the caller, so a Plaid account_id can never resolve to another
         * user's row.
         */
        const resolveAccountId = async (plaidAccount: {
            account_id: string;
            name?: string | null;
            official_name?: string | null;
        }): Promise<string> => {
            const cached = localAccountIdByPlaidId.get(plaidAccount.account_id);
            if (cached) {
                return cached;
            }

            const [existing] = await db
                .select({ id: accounts.id })
                .from(accounts)
                .where(
                    and(
                        eq(accounts.userId, userId),
                        eq(accounts.plaidId, plaidAccount.account_id)
                    )
                )
                .limit(1);

            if (existing) {
                localAccountIdByPlaidId.set(plaidAccount.account_id, existing.id);
                return existing.id;
            }

            const name = plaidAccountName(plaidAccount);
            const id = createId();

            try {
                await db.insert(accounts).values({
                    id,
                    plaidId: plaidAccount.account_id,
                    name,
                    userId,
                });
            } catch (error) {
                // BUG-005 added UNIQUE (user_id, lower(trim(name))) on accounts. A user who
                // already has a manually-created account with the same name as the Plaid one
                // hits it here -- adopt that row instead of 500ing, and link it to the Plaid
                // account so the plaid_id lookup above finds it directly next sync.
                if ((error as { code?: string }).code === "23505") {
                    const [existingByName] = await db
                        .select({ id: accounts.id, plaidId: accounts.plaidId })
                        .from(accounts)
                        .where(
                            and(
                                eq(accounts.userId, userId),
                                sql`lower(trim(${accounts.name})) = ${name.trim().toLowerCase()}`
                            )
                        )
                        .limit(1);

                    if (existingByName) {
                        if (!existingByName.plaidId) {
                            await db
                                .update(accounts)
                                .set({ plaidId: plaidAccount.account_id })
                                .where(
                                    and(
                                        eq(accounts.userId, userId),
                                        eq(accounts.id, existingByName.id)
                                    )
                                );
                        }

                        localAccountIdByPlaidId.set(plaidAccount.account_id, existingByName.id);
                        return existingByName.id;
                    }
                }

                throw error;
            }

            summary.accountsCreated += 1;
            localAccountIdByPlaidId.set(plaidAccount.account_id, id);
            return id;
        };

        /**
         * Find-or-create the local `categories` row for a Plaid personal_finance_category.
         * `null` in (uncategorized transaction) means `null` out -- we don't invent a category.
         */
        const resolveCategoryId = async (key: string | null): Promise<string | null> => {
            if (!key) {
                return null;
            }

            const cached = localCategoryIdByPlaidKey.get(key);
            if (cached) {
                return cached;
            }

            const [existing] = await db
                .select({ id: categories.id })
                .from(categories)
                .where(
                    and(
                        eq(categories.userId, userId),
                        eq(categories.plaidId, key)
                    )
                )
                .limit(1);

            if (existing) {
                localCategoryIdByPlaidKey.set(key, existing.id);
                return existing.id;
            }

            const name = titleCasePlaidCategory(key);
            const id = createId();

            try {
                await db.insert(categories).values({
                    id,
                    plaidId: key,
                    name,
                    userId,
                });
            } catch (error) {
                // Same BUG-005 unique-name index story as accounts above.
                if ((error as { code?: string }).code === "23505") {
                    const [existingByName] = await db
                        .select({ id: categories.id, plaidId: categories.plaidId })
                        .from(categories)
                        .where(
                            and(
                                eq(categories.userId, userId),
                                sql`lower(trim(${categories.name})) = ${name.trim().toLowerCase()}`
                            )
                        )
                        .limit(1);

                    if (existingByName) {
                        if (!existingByName.plaidId) {
                            await db
                                .update(categories)
                                .set({ plaidId: key })
                                .where(
                                    and(
                                        eq(categories.userId, userId),
                                        eq(categories.id, existingByName.id)
                                    )
                                );
                        }

                        localCategoryIdByPlaidKey.set(key, existingByName.id);
                        return existingByName.id;
                    }
                }

                throw error;
            }

            summary.categoriesCreated += 1;
            localCategoryIdByPlaidKey.set(key, id);
            return id;
        };

        const upsertTransaction = async (plaidTransaction: PlaidTransactionInput) => {
            const accountId = await resolveAccountId({
                account_id: plaidTransaction.account_id,
            });
            const categoryId = await resolveCategoryId(plaidCategoryKey(plaidTransaction));

            const mapped = mapPlaidTransaction(plaidTransaction, { accountId, categoryId });

            // Plaid's transaction_id is our primary key, so re-syncing the same transaction
            // (and Plaid's `modified` list) updates in place instead of duplicating.
            await db
                .insert(transactions)
                .values(mapped)
                .onConflictDoUpdate({
                    target: transactions.id,
                    set: {
                        amount: mapped.amount,
                        payee: mapped.payee,
                        date: mapped.date,
                        accountId: mapped.accountId,
                        categoryId: mapped.categoryId,
                        // `notes` deliberately not overwritten: it's user-entered, and Plaid
                        // has nothing to put there (mapPlaidTransaction always maps it to null).
                    },
                });
        };

        for (const bank of banks) {
            let cursor = bank.cursor ?? undefined;
            let hasMore = true;
            // Plaid guarantees the cursor advances, but a bounded loop means a misbehaving
            // response can't spin this request forever.
            let pagesRemaining = 100;

            while (hasMore && pagesRemaining > 0) {
                pagesRemaining -= 1;

                let page;
                try {
                    const response = await client.transactionsSync({
                        access_token: bank.accessToken,
                        cursor,
                    });
                    page = response.data;
                } catch {
                    // An invalid/revoked access_token (or any other Plaid-side failure) must
                    // not surface as an unhandled 500. Cursor progress from earlier pages is
                    // already persisted, so a retry resumes rather than restarts.
                    return c.json(
                        { error: "Failed to sync transactions with Plaid" },
                        502
                    );
                }

                // Every account referenced by this page must exist locally before its
                // transactions can be inserted (transactions.account_id is NOT NULL).
                for (const plaidAccount of page.accounts ?? []) {
                    await resolveAccountId(plaidAccount);
                }

                for (const plaidTransaction of page.added ?? []) {
                    await upsertTransaction(plaidTransaction);
                    summary.added += 1;
                }

                for (const plaidTransaction of page.modified ?? []) {
                    await upsertTransaction(plaidTransaction);
                    summary.modified += 1;
                }

                const removed = page.removed ?? [];

                if (removed.length > 0) {
                    // Ownership scoping for deletes: `transactions` has no user_id of its own,
                    // so restrict to transactions attached to the caller's accounts. A Plaid
                    // transaction_id from someone else's Item can't delete our rows.
                    const ownedAccounts = await db
                        .select({ id: accounts.id })
                        .from(accounts)
                        .where(eq(accounts.userId, userId));

                    const ownedAccountIds = ownedAccounts.map((account) => account.id);

                    for (const removedTransaction of removed) {
                        const deleted = await db
                            .delete(transactions)
                            .where(
                                and(
                                    eq(transactions.id, removedTransaction.transaction_id),
                                    inArray(transactions.accountId, ownedAccountIds)
                                )
                            )
                            .returning({ id: transactions.id });

                        summary.removed += deleted.length;
                    }
                }

                // Persist page-by-page, not once at the end: if page 4 of 7 fails, pages 1-3
                // aren't re-fetched (and, more importantly, not re-applied) on the next sync.
                await db
                    .update(connectedBanks)
                    .set({ cursor: page.next_cursor })
                    .where(
                        and(
                            eq(connectedBanks.userId, userId),
                            eq(connectedBanks.id, bank.id)
                        )
                    );

                cursor = page.next_cursor;
                hasMore = page.has_more;
            }
        }

        return c.json({ data: summary }, 200);
    }
);

export default app;