import { Hono } from "hono";
import { z } from "zod";
import { zValidator }  from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import { db } from "@/db/drizzle";
import { eq, and, inArray, gte, lte, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { transactions, insertTransactionSchema, categories, accounts } from "@/db/schema";
import { endOfDay, parse } from "date-fns";


 


const app = new Hono()
    .get("/",
      zValidator("query", z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        accountId: z.string().optional(),
      })),
        async (c) => {{
          const auth = getAuth(c);
          const { from, to, accountId } = c.req.valid("query");


          if (!auth.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }

          const startDate = from ? parse(from, "yyyy-MM-dd", new Date()) : undefined;
          // endOfDay: `to` is a calendar date with no time component, and `lte` compares
          // against it -- without this, transactions on the `to` date after midnight would
          // be excluded (BUG-006).
          const endDate = to ? endOfDay(parse(to, "yyyy-MM-dd", new Date())) : undefined;

          const data = await db
            .select({
              id: transactions.id,
              category: categories.name,
              categoryId: transactions.categoryId,
              amount: transactions.amount,
              payee: transactions.payee,
              notes: transactions.notes,
              account: accounts.name,
              accountId: transactions.accountId,
              date: transactions.date,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(
            and(
              accountId ? eq(transactions.accountId, accountId) : undefined,
              eq(accounts.userId, auth.userId),
              startDate ? gte(transactions.date, startDate) : undefined,
              endDate ? lte(transactions.date, endDate) : undefined
            )
          )
          .orderBy(desc(transactions.date)
          );
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
              id: transactions.id,
              categoryId: transactions.categoryId,
              amount: transactions.amount,
              payee: transactions.payee,
              notes: transactions.notes,
              accountId: transactions.accountId,
              date: transactions.date,
          })  
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(transactions.id, id)
            )
          )
          if (!data) {
            return c.json({ message: "Transaction not found" }, 404);
          }
          return c.json ({ data })
        }}
    )
    .post("/",
      zValidator("json", insertTransactionSchema.omit({
          id: true,
})),
        async (c) => {
          const auth = getAuth(c);
          const values = c.req.valid("json")
          if (!auth?.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }

          const [account] = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.userId, auth.userId),
                eq(accounts.id, values.accountId)
              )
            )
            .limit(1);

          if (!account) {
            return c.json({ message: "Account not found" }, 404);
          }

          if (values.categoryId) {
            const [category] = await db
              .select({ id: categories.id })
              .from(categories)
              .where(
                and(
                  eq(categories.userId, auth.userId),
                  eq(categories.id, values.categoryId)
                )
              )
              .limit(1);

            if (!category) {
              return c.json({ message: "Category not found" }, 404);
            }
          }

          const [data] = await db.insert(transactions).values({
            id: createId(),
            ...values,
          })
          .returning();

          return c.json({ data })
        }
    )
    .post("/bulk-create",
      zValidator("json", z.array(insertTransactionSchema.omit({
          id: true,
      }))),
        async (c) => {
          const auth = getAuth(c);
          const values = c.req.valid("json");
          if (!auth?.userId) {
            return c.json({ message: "Unauthorized" }, 401);
          }

          const accountIds = Array.from(new Set(values.map((value) => value.accountId)));

          const ownedAccounts = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.userId, auth.userId),
                inArray(accounts.id, accountIds)
              )
            );

          if (ownedAccounts.length !== accountIds.length) {
            return c.json({ message: "One or more accounts not found" }, 404);
          }

          const categoryIds = Array.from(
            new Set(
              values
                .map((value) => value.categoryId)
                .filter((categoryId): categoryId is string => Boolean(categoryId))
            )
          );

          if (categoryIds.length > 0) {
            const ownedCategories = await db
              .select({ id: categories.id })
              .from(categories)
              .where(
                and(
                  eq(categories.userId, auth.userId),
                  inArray(categories.id, categoryIds)
                )
              );

            if (ownedCategories.length !== categoryIds.length) {
              return c.json({ message: "One or more categories not found" }, 404);
            }
          }

          const data = await db.insert(transactions).values(
            values.map((value) => ({
              id: createId(),
              ...value,
            }))
          )
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

          const transactionsToDelete = db.$with("transactions_to_delete").as(db.select({ id: transactions.id }).from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.userId, auth.userId),
              inArray(transactions.id, values.ids)
            )
          ));

          const data = await db
          .with(transactionsToDelete)
          .delete(transactions)
          .where(
            inArray(transactions.id, sql`(SELECT id FROM ${transactionsToDelete})`)
          )
          .returning({ 
            id: transactions.id 
          });
          
          return c.json({ data });
        }
    )
    .patch(
      "/:id",
      zValidator("param", z.object({ id: z.string().optional() })),
      zValidator("json", insertTransactionSchema.omit({
        id: true,
      })),
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

        const [account] = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(accounts.id, values.accountId)
            )
          )
          .limit(1);

        if (!account) {
          return c.json({ error: "Account not found" }, 404);
        }

        if (values.categoryId) {
          const [category] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(
              and(
                eq(categories.userId, auth.userId),
                eq(categories.id, values.categoryId)
              )
            )
            .limit(1);

          if (!category) {
            return c.json({ error: "Category not found" }, 404);
          }
        }

        const transactionsToUpdate = db.$with("transactions_to_delete").as(db.select({ id: transactions.id }).from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(transactions.id, id)
            )
          ));


        const [data] = await db
          .with(transactionsToUpdate)
          .update(transactions)
          .set(values)
          .where(
            inArray(transactions.id, sql`(SELECT id FROM ${transactionsToUpdate})`)
          )
          .returning();

        if (!data) {
          return c.json({ error: "Transaction not found" }, 404);
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

        const transactionsToDelete = db.$with("transactions_to_delete").as(db.select({ id: transactions.id }).from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.userId, auth.userId),
              eq(transactions.id, id)
            )
          ));    

        const [data] = await db
          .with(transactionsToDelete)
          .delete(transactions)
          .where(
            inArray(transactions.id, sql`(SELECT id FROM ${transactionsToDelete})`)
          )
          .returning({
            id: transactions.id,
      });

        if (!data) {
          return c.json({ error: "Transaction not found" }, 404);
        }

        return c.json({ data });
      }
    );
    
export default app;