import type { FrequencyPeriod } from "@/db/schema";

export const FREQUENCY_PERIODS = ["week", "fortnight", "month", "quarter"] as const;

/** Calendar-ish period lengths. A month is 30 days, a quarter 13 weeks. */
export const PERIOD_DAYS: Record<FrequencyPeriod, number> = {
  week: 7,
  fortnight: 14,
  month: 30,
  quarter: 91,
};

export const PERIOD_LABEL: Record<FrequencyPeriod, string> = {
  week: "week",
  fortnight: "fortnight",
  month: "month",
  quarter: "quarter",
};

const DAY_MS = 86_400_000;

/**
 * "count per period" → days between calls.
 * 2 per week → 3.5 days; 1 per month → 30 days; 3 per quarter → ~30.3 days.
 */
export function intervalDays(period: FrequencyPeriod, count: number): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`frequencyCount must be a positive integer, got ${count}`);
  }
  return PERIOD_DAYS[period] / count;
}

export function intervalMs(period: FrequencyPeriod, count: number): number {
  return Math.round(intervalDays(period, count) * DAY_MS);
}

/**
 * The core spacing rule. `nextDueAt` is always derived from the *last real
 * conversation*, never from the previous `nextDueAt` — so missing a call
 * doesn't stack up debt, and calling early moves the whole schedule earlier.
 *
 * With no conversation on record, the person is due from `fallback`
 * (normally the moment they were added).
 */
export function computeNextDue(
  lastConversationAt: Date | null,
  period: FrequencyPeriod,
  count: number,
  fallback: Date,
): Date {
  if (!lastConversationAt) return new Date(fallback.getTime());
  return new Date(lastConversationAt.getTime() + intervalMs(period, count));
}

/** Human label: "2× a week", "once a month". */
export function describeFrequency(period: FrequencyPeriod, count: number): string {
  const per = PERIOD_LABEL[period];
  if (count === 1) return `once a ${per}`;
  return `${count}× a ${per}`;
}
