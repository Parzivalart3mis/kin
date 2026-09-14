/**
 * Seeds a demo user with a handful of people at different frequencies and
 * timezones so the due-today logic has something to chew on locally.
 *
 *   pnpm db:seed                          # attaches to clerkId "user_demo"
 *   SEED_CLERK_USER_ID=user_xxx pnpm db:seed   # attaches to *your* Clerk user
 *
 * Re-runnable: people are matched by (user, name) and updated in place.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { callLogs, people, users, type FrequencyPeriod } from "../src/db/schema";
import { computeNextDue } from "../src/lib/interval";
import { toE164 } from "../src/lib/phone";

const DAY = 86_400_000;

interface SeedPerson {
  name: string;
  phone: string;
  countryCode: string;
  timezone: string;
  frequencyCount: number;
  frequencyPeriod: FrequencyPeriod;
  /** Days ago the last real conversation happened; null = never. */
  lastCallDaysAgo: number | null;
}

const PEOPLE: SeedPerson[] = [
  { name: "Mummy", phone: "98765 43210", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 3, frequencyPeriod: "week", lastCallDaysAgo: 3 }, // due
  { name: "Jija ji", phone: "98123 45678", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 1, frequencyPeriod: "fortnight", lastCallDaysAgo: 16 }, // overdue
  { name: "Cousin Aarav", phone: "0412 345 678", countryCode: "AU", timezone: "Australia/Sydney", frequencyCount: 1, frequencyPeriod: "month", lastCallDaysAgo: 10 }, // not yet
  { name: "Nani", phone: "(312) 555-0142", countryCode: "US", timezone: "America/Chicago", frequencyCount: 2, frequencyPeriod: "week", lastCallDaysAgo: null }, // new → due
];

async function main() {
  const clerkId = process.env.SEED_CLERK_USER_ID ?? "user_demo";
  const timezone = process.env.SEED_TIMEZONE ?? "America/Chicago";
  const now = new Date();

  await db
    .insert(users)
    .values({ clerkId, timezone, notificationTime: "09:00" })
    .onConflictDoNothing({ target: users.clerkId });
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!user) throw new Error("user upsert failed");

  for (const p of PEOPLE) {
    const phone = toE164(p.phone, p.countryCode);
    if (!phone) throw new Error(`bad seed phone for ${p.name}`);
    const lastConversationAt = p.lastCallDaysAgo === null ? null : new Date(now.getTime() - p.lastCallDaysAgo * DAY);
    const createdAt = new Date(now.getTime() - 30 * DAY);
    const nextDueAt = computeNextDue(lastConversationAt, p.frequencyPeriod, p.frequencyCount, createdAt);

    const existing = await db.query.people.findFirst({
      where: and(eq(people.userId, user.id), eq(people.name, p.name)),
    });
    const values = {
      userId: user.id,
      name: p.name,
      phone,
      countryCode: p.countryCode,
      timezone: p.timezone,
      frequencyCount: p.frequencyCount,
      frequencyPeriod: p.frequencyPeriod,
      lastConversationAt,
      nextDueAt,
      updatedAt: now,
    };
    let personId: string;
    if (existing) {
      await db.update(people).set(values).where(eq(people.id, existing.id));
      personId = existing.id;
    } else {
      const [row] = await db.insert(people).values({ ...values, createdAt }).returning({ id: people.id });
      personId = row!.id;
    }

    if (lastConversationAt) {
      await db.delete(callLogs).where(eq(callLogs.personId, personId));
      await db.insert(callLogs).values({ personId, userId: user.id, type: "completed", occurredAt: lastConversationAt });
    }
    console.log(`${existing ? "updated" : "added"}  ${p.name.padEnd(14)} ${p.frequencyCount}/${p.frequencyPeriod.padEnd(9)} next due ${nextDueAt.toISOString().slice(0, 10)}`);
  }

  console.log(`\nSeeded ${PEOPLE.length} people for clerkId=${clerkId} (${timezone}).`);
  console.log("Sign in with that Clerk user to see them on Today.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
