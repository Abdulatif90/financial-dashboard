import { Hono } from "hono";
import { Configuration, PlaidEnvironments, PlaidApi, Products, CountryCode } from "plaid";
import { getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { connectedBanks } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";

const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
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
);

export default app;