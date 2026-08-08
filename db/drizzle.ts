import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// BUG-018: constructing the Neon client / drizzle instance at module scope means importing
// this file at all crashes immediately if DATABASE_URL is unset -- before any request-level
// error handling can catch it. Both are built lazily instead, on first actual use, so a
// missing env var fails the specific request/script that needed the DB, not every import of
// this module.

function requireDatabaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL is not defined");
    }
    return url;
}

type SqlClient = ReturnType<typeof neon>;
let sqlClient: SqlClient | undefined;

function getSqlClient(): SqlClient {
    if (!sqlClient) {
        sqlClient = neon(requireDatabaseUrl());
    }
    return sqlClient;
}

export const sql: SqlClient = new Proxy(function sql() {} as unknown as SqlClient, {
    apply(_target, thisArg, args) {
        return Reflect.apply(getSqlClient() as unknown as (...args: unknown[]) => unknown, thisArg, args);
    },
    get(_target, prop) {
        const value = Reflect.get(getSqlClient() as object, prop);
        return typeof value === "function" ? value.bind(getSqlClient()) : value;
    },
});

type Db = ReturnType<typeof drizzle>;
let dbInstance: Db | undefined;

function getDb(): Db {
    if (!dbInstance) {
        dbInstance = drizzle({ client: getSqlClient() });
    }
    return dbInstance;
}

export const db: Db = new Proxy({} as Db, {
    get(_target, prop) {
        const real = getDb();
        const value = Reflect.get(real as object, prop);
        return typeof value === "function" ? value.bind(real) : value;
    },
});
