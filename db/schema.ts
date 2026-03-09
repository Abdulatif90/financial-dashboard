import { createInsertSchema } from "drizzle-zod";
import {
    integer, 
    pgTable, 
    text,
    timestamp } from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { z } from "zod";

const nullableText = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const trimmedValue = value.trim();
        return trimmedValue === "" ? null : trimmedValue;
    },
    z.string().trim().nullable().optional()
);

export const accounts = pgTable("accounts", {
    id: text("id").primaryKey(),
    plaidId: text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
    transactions: many(transactions),
}));

export const insertAccountSchema = createInsertSchema(accounts);


export const categories = pgTable("categories", {
    id: text("id").primaryKey(),
    plaidId: text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
    transactions: many(transactions),
}));

export const insertCategorySchema = createInsertSchema(categories);


export const transactions = pgTable("transactions", {
    id: text("id").primaryKey(),
    amount: integer("amount").notNull(),
    payee: text("payee").notNull(),
    notes: text("notes"),
    date: timestamp("date", { mode: "date"}).notNull(),
    accountId: text("account_id").references(() => accounts.id, {
        onDelete: "cascade",
    }).notNull(),
    categoryId: text("category_id").references(() => categories.id, {
        onDelete: "set null",
    }),
})

export const transactionsRelations = relations(transactions, ({ one }) => ({
    account: one(accounts, {
        fields: [transactions.accountId],
        references: [accounts.id],
    }),
    category: one(categories, {
        fields: [transactions.categoryId],
        references: [categories.id],
    }),
}));

export const insertTransactionSchema = createInsertSchema(transactions, {
    date: z.coerce.date().refine((value) => value <= new Date(), {
        message: "Date cannot be in the future",
    }),
    accountId: z.string().trim().min(1, "Account is required"),
    categoryId: nullableText,
    payee: z.string().trim().min(1, "Payee is required"),
    amount: z.number().finite(),
    notes: nullableText,
});

export const connectedBanks = pgTable("connected_banks", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    accessToken: text("access_token").notNull(),
});