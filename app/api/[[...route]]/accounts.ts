import { Hono } from "hono";
import { z } from "zod";
import { zValidator }  from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { accounts, insertAccountSchema } from "@/db/schema";
import { db } from "@/db/drizzle";
import { eq, and, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";


 


const app = new Hono()
    .get("/",
      clerkMiddleware(),
        async (c) => {{
          const auth = getAuth(c);


          if (!auth.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }
          const data = await db
            .select({
              id: accounts.id,
              name: accounts.name,
          })
          .from(accounts)
          .where(eq(accounts.userId, auth.userId))
          return c.json ({ data })
        }}
    )
    .get("/:id",
      zValidator("param", z.object({ id: z.string().optional() })),
      clerkMiddleware(),
        async (c) => {{ 
          const auth = getAuth(c);
          const { id } = c.req.valid("param");
          if (!id) {
            return c.json({ message: "Missing ID" }, 401);
          }
          if (!auth.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }

          const [data] = await db
            .select({
              id: accounts.id,
              name: accounts.name,
          })  
          .from(accounts)
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(accounts.id, id)
            )
          )
          if (!data) {
            return c.json({ message: "Account not found" }, 404);
          }
          return c.json ({ data })
        }}
    )
    .post("/",
      clerkMiddleware(),
      zValidator("json", insertAccountSchema.pick({
          name: true,
})),
        async (c) => {
          const auth = getAuth(c);
          const values = c.req.valid("json")
          if (!auth?.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }
          const [data] = await db.insert(accounts).values({
            id: createId(),
            userId: auth.userId,
            ...values,
          })
          .returning();

          return c.json({ data })
        }
    )
    .post(
      "/bulk-delete",
      clerkMiddleware(),
      zValidator(
        "json", 
        z.object({
          ids: z.array(z.string())
        })), // Expect an array of account IDs
        async (c) => {
          const auth = getAuth(c);
          const values = c.req.valid("json");
          if (!auth?.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }
          const data = await db
          .delete(accounts)
          .where(
            and(
              eq(accounts.userId, auth.userId),
              inArray(accounts.id, values.ids)
            )
          )
          .returning({
            id: accounts.id,
          });
          return c.json({ data });
        }
    )

export default app;