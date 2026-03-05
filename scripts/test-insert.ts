import { config } from "dotenv";
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { createId } from "@paralleldrive/cuid2";
import { accounts, insertAccountSchema } from "../db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

async function test() {
  console.log("1. Testing insertAccountSchema...");
  try {
    const schema = insertAccountSchema.pick({ name: true });
    console.log("   Schema created OK:", schema);
    const result = schema.parse({ name: "Test" });
    console.log("   Schema.parse OK:", result);
  } catch (e) {
    console.error("   Schema error:", e);
  }

  console.log("2. Testing DB insert...");
  try {
    const [data] = await db.insert(accounts).values({
      id: createId(),
      userId: "test-user",
      name: "Test Account",
    }).returning();
    console.log("   Insert OK:", data);

    // Clean up
    const { eq } = await import("drizzle-orm");
    await db.delete(accounts).where(eq(accounts.id, data.id));
    console.log("   Cleanup OK");
  } catch (e) {
    console.error("   DB insert error:", e);
  }
}

test();
