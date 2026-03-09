import { Hono } from "hono";

import accounts from "./accounts";
import categories from "./categories";
import plaid from "./plaid";
import summary from "./summary";
import transactions from "./transactions";

export const app = new Hono().basePath("/api")
    .route("/accounts", accounts)
    .route("/categories", categories)
    .route("/transactions", transactions)
    .route("/summary", summary)
    .route("/plaid", plaid);

export type AppType = typeof app;