/**
 * Timezone helpers built on Intl only — no date library.
 * All maths happen on UTC instants; zones are only used to *read* wall-clock
 * fields or to *find* the instant for a wall-clock time.
 */

const NIGHT_START_HOUR = 21; // 21:00 local and later is "their night"
const NIGHT_END_HOUR = 8; // ...until 08:00 local

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock fields of `instant` as seen in `tz`. */
export function wallClock(instant: Date, tz: string): WallClock {
  const parts: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24, // some engines emit "24" at midnight
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Milliseconds that `tz` is ahead of UTC at `instant`. */
export function tzOffsetMs(instant: Date, tz: string): number {
  const w = wallClock(instant, tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant for a wall-clock time in `tz`. Handles DST by iterating once. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let result = guess - off1;
  const off2 = tzOffsetMs(new Date(result), tz);
  if (off2 !== off1) result = guess - off2;
  return new Date(result);
}

/** [start, end) of the calendar day containing `instant` in `tz`. */
export function dayBounds(instant: Date, tz: string): { start: Date; end: Date } {
  const w = wallClock(instant, tz);
  const start = zonedTimeToUtc(w.year, w.month, w.day, 0, 0, tz);
  // Next local midnight — go via wall-clock so a 23h/25h DST day is still one day.
  const nextDay = new Date(Date.UTC(w.year, w.month - 1, w.day + 1));
  const end = zonedTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    tz,
  );
  return { start, end };
}

/** "YYYY-MM-DD" of `instant` in `tz`. */
export function localDateKey(instant: Date, tz: string): string {
  const w = wallClock(instant, tz);
  const mm = String(w.month).padStart(2, "0");
  const dd = String(w.day).padStart(2, "0");
  return `${w.year}-${mm}-${dd}`;
}

/** "HH:mm" of `instant` in `tz`. */
export function localTimeString(instant: Date, tz: string): string {
  const w = wallClock(instant, tz);
  return `${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`;
}

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

export function isNightAt(instant: Date, tz: string): boolean {
  return isNightHour(wallClock(instant, tz).hour);
}

/** Parse "HH:mm" → { hour, minute }; throws on malformed input. */
export function parseHHmm(value: string): { hour: number; minute: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new RangeError(`Expected HH:mm, got "${value}"`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new RangeError(`Out of range time "${value}"`);
  return { hour, minute };
}
