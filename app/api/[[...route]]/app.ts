import { Hono } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

import accounts from "./accounts";
import categories from "./categories";
import plaid from "./plaid";
import summary from "./summary";
import transactions from "./transactions";

export const app = new Hono().basePath("/api")
    .use("*", clerkMiddleware())
    .use("*", async (c, next) => {
        const auth = getAuth(c);
        if (!auth?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }
        await next();
    })
    .route("/accounts", accounts)
    .route("/categories", categories)
    .route("/transactions", transactions)
    .route("/summary", summary)
    .route("/plaid", plaid);

export type AppType = typeof app;