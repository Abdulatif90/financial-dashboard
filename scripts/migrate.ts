import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http/driver";
 

config( { path: ".env" } );

export const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });

const main = async () => {
    try {
        await migrate(db, { migrationsFolder: "drizzle" });
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }        
};

main();