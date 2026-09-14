import type { CallLog, Person } from "@/db/schema";
import { dayBounds, isNightAt, localTimeString } from "./tz";

export interface PersonStatus {
  /** "HH:mm" in the person's own zone. */
  localTime: string;
  /** True when it's late evening / early morning for them. */
  isNight: boolean;
  /** A completed call was logged today (user's day). */
  struckToday: boolean;
  /** Number of no-answer attempts logged today. */
  attemptsToday: number;
  /** ISO time of the most recent attempt today, if any. */
  lastAttemptAt: string | null;
}

export type PersonWithStatus = Person & PersonStatus;

/**
 * A person belongs on today's list if they're due by the end of the user's day
 * (this includes anyone overdue — there's no separate backlog) OR if they were
 * called today (they stay, struck through, until midnight).
 */
export function isOnTodaysList(
  person: Pick<Person, "nextDueAt">,
  struckToday: boolean,
  dayEnd: Date,
): boolean {
  return struckToday || person.nextDueAt.getTime() < dayEnd.getTime();
}

export function logsToday(
  logs: readonly Pick<CallLog, "type" | "occurredAt">[],
  bounds: { start: Date; end: Date },
): { completed: boolean; attempts: Pick<CallLog, "type" | "occurredAt">[] } {
  let completed = false;
  const attempts: Pick<CallLog, "type" | "occurredAt">[] = [];
  for (const l of logs) {
    const t = l.occurredAt.getTime();
    if (t < bounds.start.getTime() || t >= bounds.end.getTime()) continue;
    if (l.type === "completed") completed = true;
    else attempts.push(l);
  }
  return { completed, attempts };
}

export function decorate(
  person: Person,
  logs: readonly Pick<CallLog, "type" | "occurredAt">[],
  now: Date,
  bounds: { start: Date; end: Date },
): PersonWithStatus {
  const { completed, attempts } = logsToday(logs, bounds);
  const latest = attempts.reduce<Date | null>(
    (acc, a) => (acc && acc > a.occurredAt ? acc : a.occurredAt),
    null,
  );
  return {
    ...person,
    localTime: localTimeString(now, person.timezone),
    isNight: isNightAt(now, person.timezone),
    struckToday: completed,
    attemptsToday: attempts.length,
    lastAttemptAt: latest ? latest.toISOString() : null,
  };
}

/**
 * Deliberately plain ordering: alphabetical, with today's completed calls sunk
 * to the bottom. No "most overdue first" — that's urgency scoring in disguise.
 */
export function sortForToday<T extends { name: string; struckToday: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.struckToday !== b.struckToday) return a.struckToday ? 1 : -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

/**
 * Full pipeline used by GET /api/due-today: decorate every person, keep those
 * on today's list, sort.
 */
export function buildTodayList(
  people: Person[],
  logsByPerson: ReadonlyMap<string, Pick<CallLog, "type" | "occurredAt">[]>,
  now: Date,
  userTz: string,
): PersonWithStatus[] {
  const bounds = dayBounds(now, userTz);
  const out: PersonWithStatus[] = [];
  for (const p of people) {
    const d = decorate(p, logsByPerson.get(p.id) ?? [], now, bounds);
    if (isOnTodaysList(p, d.struckToday, bounds.end)) out.push(d);
  }
  return sortForToday(out);
}
