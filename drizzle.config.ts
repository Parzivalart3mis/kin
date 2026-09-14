import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Vercel-style local env; `source .env.local` breaks on URLs containing `&`.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
