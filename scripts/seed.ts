import { config } from "dotenv";
import { subDays } from "date-fns";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http/driver";
import { eq } from "drizzle-orm";
import { transactions, accounts, categories } from "@/db/schema";

config( { path: ".env" } );

export const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });

const SEED_USER_ID = "user_3ARwgK8gXNNazuKc6eRyA1wldwa|1234567890";
const SEED_CATEGORIES = [
    { id: "category_1", name: "Salary", userId: SEED_USER_ID, plaidId: null },
    { id: "category_2", name: "Groceries", userId: SEED_USER_ID, plaidId: null },
    { id: "category_3", name: "Entertainment", userId: SEED_USER_ID, plaidId: null },
    { id: "category_4", name: "Utilities", userId: SEED_USER_ID, plaidId: null },
    { id: "category_5", name: "Transportation", userId: SEED_USER_ID, plaidId: null },
    { id: "category_6", name: "Healthcare", userId: SEED_USER_ID, plaidId: null },
];

const SEED_ACCOUNT = [
    { id: "account_1", userId: SEED_USER_ID, plaidId: null, 
    name: "Checking Account", 
    type: "checking", 
    subtype: "checking", 
    mask: "1234" },
];

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 30);

import { eachDayOfInterval, format } from "date-fns";

const SEED_TRANSACTIONS: typeof transactions.$inferSelect[] = [];   

const generateRandomAmount = (category: typeof categories.$inferInsert) => {
    switch (category.name) {
        case "Salary":
            return Math.floor(Math.random() * 2000) + 3000; // $3000 - $5000
        case "Groceries":
            return -(Math.floor(Math.random() * 100) + 50); // $50 - $150
        case "Entertainment":
            return -(Math.floor(Math.random() * 100) + 20); // $20 - $120   
        case "Utilities":
            return -(Math.floor(Math.random() * 200) + 100);
        case "Transportation":  
            return -(Math.floor(Math.random() * 50) + 20);
        case "Healthcare":
            return -(Math.floor(Math.random() * 300) + 50);
        default:
            return 0;
    }
};

const genrateSeedTransactionsForDays = ( day: Date ) =>{
    const numTransactions = Math.floor(Math.random() * 3) + 1; // 1-3 transactions per day
    
    for (let i = 0; i < numTransactions; i++) {
        const category = SEED_CATEGORIES[Math.floor(Math.random() * SEED_CATEGORIES.length)];
        const isExpense = Math.random() < 0.7; // 70% chance of being an expense
        const amount = generateRandomAmount(category);
        SEED_TRANSACTIONS.push({
            id: `${format(day, "yyyyMMdd")}-${i}`,
            accountId: SEED_ACCOUNT[0].id,
            categoryId: category.id,
            amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
            date: day,
            notes: "Random transactions",
            payee: "Merchant " + Math.floor(Math.random() * 100),
        });
    }
}

const generateTransactions = () => {
    const days = eachDayOfInterval({
        start: defaultFrom,
        end: defaultTo,
    });
    days.forEach(day => genrateSeedTransactionsForDays(day));
}

generateTransactions();

const main = async () => {
    try {
        // Reset database
        await db.delete(transactions).where(eq(transactions.accountId, SEED_ACCOUNT[0].id));
        await db.delete(accounts).where(eq(accounts.userId, SEED_USER_ID));
        await db.delete(categories).where(eq(categories.userId, SEED_USER_ID));

        //seed categories and accounts first as transactions depend on them
        await db.insert(categories).values(SEED_CATEGORIES);
        await db.insert(accounts).values(SEED_ACCOUNT);
        await db.insert(transactions).values(SEED_TRANSACTIONS);
    
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

main();  