import { Hono } from "hono";
import { z } from "zod";
import { zValidator }  from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import { categories, insertCategorySchema } from "@/db/schema";
import { db } from "@/db/drizzle";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";


 


const categoryNameSchema = z.object({
  name: insertCategorySchema.shape.name.pipe(z.string().trim().min(1, "Name is required")),
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
              id: categories.id,
              name: categories.name,
          })
          .from(categories)
          .where(eq(categories.userId, auth.userId))
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
              id: categories.id,
              name: categories.name,
          })  
          .from(categories)
          .where(
            and(
              eq(categories.userId, auth.userId),
              eq(categories.id, id)
            )
          )
          if (!data) {
            return c.json({ message: "Category not found" }, 404);
          }
          return c.json ({ data })
        }}
    )
    .post("/",
      zValidator("json", categoryNameSchema),
        async (c) => {
          const auth = getAuth(c);
          const values = c.req.valid("json")
          if (!auth?.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }

          const normalizedName = values.name.trim().toLowerCase();

          const [existingCategory] = await db
            .select()
            .from(categories)
            .where(
              and(
                eq(categories.userId, auth.userId),
                sql`lower(trim(${categories.name})) = ${normalizedName}`
              )
            )
            .limit(1);

          if (existingCategory) {
            return c.json({ data: existingCategory });
          }

          try {
            const [data] = await db.insert(categories).values({
              id: createId(),
              userId: auth.userId,
              name: values.name.trim(),
            })
            .returning();

            return c.json({ data })
          } catch (error) {
            // BUG-005: the select-then-insert above has a race -- two concurrent requests
            // can both miss the pre-check. The DB-level unique index (categories_user_id_
            // name_unique_idx) is the actual guard; on a genuine race, fall back to the same
            // "return the existing row" behavior as the pre-check, instead of a 500.
            if ((error as { code?: string }).code === "23505") {
              const [raceWinner] = await db
                .select()
                .from(categories)
                .where(
                  and(
                    eq(categories.userId, auth.userId),
                    sql`lower(trim(${categories.name})) = ${normalizedName}`
                  )
                )
                .limit(1);

              if (raceWinner) {
                return c.json({ data: raceWinner });
              }
            }

            throw error;
          }
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
          .delete(categories)
          .where(
            and(
              eq(categories.userId, auth.userId),
              inArray(categories.id, values.ids)
            )
          )
          .returning({
            id: categories.id,
          });
          return c.json({ data });
        }
    )
    .patch(
      "/:id",
      zValidator("param", z.object({ id: z.string().optional() })),
      zValidator("json", categoryNameSchema),
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
          .update(categories)
          .set({
            name: values.name.trim(),
          })
          .where(
            and(
              eq(categories.userId, auth.userId),
              eq(categories.id, id)
            )
          )
          .returning();

        if (!data) {
          return c.json({ error: "Category not found" }, 404);
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
          .delete(categories)
          .where(
            and(
              eq(categories.userId, auth.userId),
              eq(categories.id, id)
            )
          )
          .returning({
            id: categories.id,
      });

        if (!data) {
          return c.json({ error: "Category not found" }, 404);
        }

        return c.json({ data });
      }
    );

export default app;