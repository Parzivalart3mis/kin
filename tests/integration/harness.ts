import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { __setDbForTests, type Db } from "@/db";
import * as schema from "@/db/schema";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../drizzle");

/**
 * In-process Postgres via PGlite with the real drizzle-kit migrations applied.
 * Call `setupTestDb()` in `beforeAll`, `resetTestDb()` in `beforeEach`.
 */
export async function setupTestDb(): Promise<Db> {
  const client = new PGlite();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
  const db = drizzle(client, { schema }) as unknown as Db;
  __setDbForTests(db);
  return db;
}

export async function resetTestDb(db: Db): Promise<void> {
  await db.execute(
    `truncate table call_logs, push_subscriptions, people, users restart identity cascade`,
  );
}

export async function createTestUser(db: Db, over: Partial<schema.User> = {}): Promise<schema.User> {
  const [u] = await db
    .insert(schema.users)
    .values({ clerkId: over.clerkId ?? `clerk_${Math.random().toString(36).slice(2)}`, ...over })
    .returning();
  if (!u) throw new Error("no user");
  return u;
}
