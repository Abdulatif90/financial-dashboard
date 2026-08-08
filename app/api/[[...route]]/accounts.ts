import { Hono } from "hono";
import { z } from "zod";
import { zValidator }  from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import { accounts, insertAccountSchema } from "@/db/schema";
import { db } from "@/db/drizzle";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";


 


const accountNameSchema = z.object({
  name: insertAccountSchema.shape.name.pipe(z.string().trim().min(1, "Name is required")),
});

const app = new Hono()
    .get("/",
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
      zValidator("json", accountNameSchema),
        async (c) => {
          const auth = getAuth(c);
          const values = c.req.valid("json")
          if (!auth?.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }

          const normalizedName = values.name.trim().toLowerCase();

          const [existingAccount] = await db
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.userId, auth.userId),
                sql`lower(trim(${accounts.name})) = ${normalizedName}`
              )
            )
            .limit(1);

          if (existingAccount) {
            return c.json({ data: existingAccount });
          }

          const [data] = await db.insert(accounts).values({
            id: createId(),
            userId: auth.userId,
            name: values.name.trim(),
          })
          .returning();

          return c.json({ data })
        }
    )
    .post(
      "/bulk-delete",
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
    .patch(
      "/:id",
      zValidator("param", z.object({ id: z.string().optional() })),
      zValidator("json", accountNameSchema),
      async (c) => {
        const auth = getAuth(c);
        const { id } = c.req.valid("param");
        const values = c.req.valid("json");

        if (!id) {
          return c.json({ error: "Missing ID" }, 401);
        }
        if (!auth.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const [data] = await db
          .update(accounts)
          .set({
            name: values.name.trim(),
          })
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(accounts.id, id)
            )
          )
          .returning();

        if (!data) {
          return c.json({ error: "Account not found" }, 404);
        }

        return c.json({ data });
      }
    )
    .delete(
      "/:id",
      zValidator("param", z.object({ id: z.string().optional() })),
      async (c) => {
        const auth = getAuth(c);
        const { id } = c.req.valid("param");
        if (!id) {
          return c.json({ error: "Missing ID" }, 401);
        }
        if (!auth.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const [data] = await db
          .delete(accounts)
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(accounts.id, id)
            )
          )
          .returning({
            id: accounts.id,
      });

        if (!data) {
          return c.json({ error: "Account not found" }, 404);
        }

        return c.json({ data });
      }
    );

export default app;