import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let instance: Db | undefined;

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(url), { schema });
}

/**
 * Lazy singleton. `neon()` throws at import time when the URL is empty, which
 * would break `next build`'s page-data collection — so we defer until first use.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    instance ??= create();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/** Test seam: swap the underlying database (e.g. for PGlite). */
export function __setDbForTests(next: Db | undefined): void {
  instance = next;
}

export { schema };
