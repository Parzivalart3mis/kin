import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { callLogs, people, type CallLog, type Person, type User } from "@/db/schema";
import { buildTodayList, type PersonWithStatus } from "@/lib/due";
import { AppError } from "@/lib/errors";
import { computeNextDue } from "@/lib/interval";
import { log } from "@/lib/logger";
import { dayBounds } from "@/lib/tz";
import { getPerson } from "./people";

export interface LoggedCall {
  log: CallLog;
  person: Person;
}

/**
 * `completed` → write the log, set lastConversationAt, re-derive nextDueAt.
 * `attempt`   → write the log only; the timer is untouched.
 *
 * neon-http has no transactions, so the person update happens after the log
 * insert; an update failure leaves an orphan log but never a wrong due date.
 */
export async function logCall(
  user: User,
  personId: string,
  type: CallLog["type"],
  occurredAt = new Date(),
): Promise<LoggedCall> {
  const person = await getPerson(user.id, personId);

  const [inserted] = await db
    .insert(callLogs)
    .values({ personId: person.id, userId: user.id, type, occurredAt })
    .returning();
  if (!inserted) throw new AppError("INTERNAL", "Insert returned no row");

  if (type === "attempt") {
    log.info("call_attempt", { personId: person.id });
    return { log: inserted, person };
  }

  // Offline replays can arrive out of order; never move the last conversation backwards.
  const lastConversationAt =
    person.lastConversationAt && person.lastConversationAt > occurredAt
      ? person.lastConversationAt
      : occurredAt;

  const [updated] = await db
    .update(people)
    .set({
      lastConversationAt,
      nextDueAt: computeNextDue(
        lastConversationAt,
        person.frequencyPeriod,
        person.frequencyCount,
        person.nextDueAt,
      ),
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, person.id), eq(people.userId, user.id)))
    .returning();
  if (!updated) throw new AppError("INTERNAL", "Update returned no row");

  log.info("call_completed", { personId: person.id });
  return { log: inserted, person: updated };
}

/** Everyone due by the end of the user's local day, plus anyone called today. */
export async function getTodayList(user: User, now = new Date()): Promise<PersonWithStatus[]> {
  const all = await db.query.people.findMany({ where: eq(people.userId, user.id) });
  if (all.length === 0) return [];

  const { start } = dayBounds(now, user.timezone);
  const logs = await db
    .select({ personId: callLogs.personId, type: callLogs.type, occurredAt: callLogs.occurredAt })
    .from(callLogs)
    .where(
      and(
        eq(callLogs.userId, user.id),
        gte(callLogs.occurredAt, start),
        inArray(
          callLogs.personId,
          all.map((p) => p.id),
        ),
      ),
    );

  const byPerson = new Map<string, { type: CallLog["type"]; occurredAt: Date }[]>();
  for (const l of logs) {
    const bucket = byPerson.get(l.personId);
    if (bucket) bucket.push(l);
    else byPerson.set(l.personId, [l]);
  }

  return buildTodayList(all, byPerson, now, user.timezone);
}
