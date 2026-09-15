import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions, users, type User } from "@/db/schema";
import { log } from "@/lib/logger";
import { sendPush, type PushPayload } from "@/lib/push";
import { localDateKey, parseHHmm, wallClock } from "@/lib/tz";
import { getTodayList } from "./calls";

/** "Time to call Mummy", "…Mummy and Jija ji", "…Mummy, Jija ji and 2 others". No exclamation marks. */
export function composeBody(names: readonly string[]): string {
  const [a, b, ...rest] = names;
  if (!a) return "";
  if (!b) return `Time to call ${a}`;
  if (rest.length === 0) return `Time to call ${a} and ${b}`;
  const others = rest.length === 1 ? "1 other" : `${rest.length} others`;
  return `Time to call ${a}, ${b} and ${others}`;
}

/** Has the user's local clock passed their notification time today? */
export function isPastNotificationTime(user: Pick<User, "timezone" | "notificationTime">, now: Date): boolean {
  const w = wallClock(now, user.timezone);
  const { hour, minute } = parseHHmm(user.notificationTime);
  return w.hour > hour || (w.hour === hour && w.minute >= minute);
}

export interface DailyPushResult {
  considered: number;
  sent: number;
  skippedEmpty: number;
}

/**
 * Called by the cron on a schedule. For every user who is past their
 * notification time and hasn't been notified today (their day), build the
 * list and push once. Marks the day as done even when nobody is due, so a
 * quiet day stays quiet rather than nagging the next tick.
 *
 * Runs correctly at any cadence: every 15 minutes (the cron-job.org schedule)
 * gives near-on-time delivery; a sparser schedule still delivers at the first
 * tick after each user's time, never twice.
 */
export async function runDailyPush(now = new Date()): Promise<DailyPushResult> {
  const result: DailyPushResult = { considered: 0, sent: 0, skippedEmpty: 0 };

  // Only users who actually have a device subscribed.
  const candidates = await db
    .selectDistinct({ user: users })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id));

  for (const { user } of candidates) {
    let today: string;
    try {
      today = localDateKey(now, user.timezone);
      if (user.lastNotifiedOn === today) continue;
      if (!isPastNotificationTime(user, now)) continue;
    } catch {
      log.warn("daily_push_bad_user_settings", { userId: user.id });
      continue;
    }
    result.considered++;

    // Claim the day first so two overlapping cron runs can't both send.
    const claimed = await db
      .update(users)
      .set({ lastNotifiedOn: today })
      .where(
        and(eq(users.id, user.id), or(isNull(users.lastNotifiedOn), ne(users.lastNotifiedOn, today))),
      )
      .returning({ id: users.id });
    if (claimed.length === 0) continue;

    const list = (await getTodayList(user, now)).filter((p) => !p.struckToday);
    if (list.length === 0) {
      result.skippedEmpty++;
      continue;
    }

    const payload: PushPayload = {
      title: "Kin",
      body: composeBody(list.map((p) => p.name)),
      url: "/today",
      tag: `kin-daily-${today}`,
    };
    const subs = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, user.id),
    });
    let delivered = false;
    for (const sub of subs) {
      if (await sendPush(sub, payload)) delivered = true;
    }
    if (delivered) result.sent++;
    log.info("daily_push", { userId: user.id, people: list.length, delivered });
  }

  return result;
}
