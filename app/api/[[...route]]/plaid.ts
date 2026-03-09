import { Hono } from "hono";
import { clerkMiddleware } from "@hono/clerk-auth";
import { Configuration, PlaidEnvironments, PlaidApi, Products, CountryCode } from "plaid";
import { getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
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
    clerkMiddleware(),
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
    clerkMiddleware(),
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

         const [ connectedBank ] = await db
         .insert(connectedBanks)
         .values({
            id: createId(),
            userId: auth.userId,
            accessToken: exchange.data.access_token,
         })
            .returning();

        return c.json({ data: exchange.data.access_token }, 200);
    }
);

export default app;