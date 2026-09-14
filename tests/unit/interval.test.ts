import { describe, expect, it } from "vitest";
import { computeNextDue, describeFrequency, intervalDays, intervalMs } from "@/lib/interval";

const DAY = 86_400_000;

describe("intervalDays", () => {
  it("divides the period by the count", () => {
    expect(intervalDays("week", 1)).toBe(7);
    expect(intervalDays("week", 2)).toBe(3.5);
    expect(intervalDays("fortnight", 1)).toBe(14);
    expect(intervalDays("month", 1)).toBe(30);
    expect(intervalDays("month", 3)).toBe(10);
    expect(intervalDays("quarter", 1)).toBe(91);
  });

  it("rejects non-positive or fractional counts", () => {
    expect(() => intervalDays("week", 0)).toThrow(RangeError);
    expect(() => intervalDays("week", -1)).toThrow(RangeError);
    expect(() => intervalDays("week", 1.5)).toThrow(RangeError);
  });

  it("intervalMs rounds to whole milliseconds", () => {
    expect(intervalMs("week", 2)).toBe(3.5 * DAY);
    expect(intervalMs("quarter", 3)).toBe(Math.round((91 / 3) * DAY));
  });
});

describe("computeNextDue — spacing, not accumulation", () => {
  const period = "week";
  const count = 1;

  it("falls back to the given instant when there is no conversation yet", () => {
    const added = new Date("2026-09-14T10:00:00Z");
    const due = computeNextDue(null, period, count, added);
    expect(due.getTime()).toBe(added.getTime());
  });

  it("is lastConversationAt + interval", () => {
    const last = new Date("2026-09-14T10:00:00Z");
    const due = computeNextDue(last, period, count, new Date(0));
    expect(due.toISOString()).toBe("2026-09-21T10:00:00.000Z");
  });

  it("does not stack missed intervals: a late call resets from the call, not from the old due date", () => {
    // Due 21 Sep, but the call happened 30 Sep. Next due must be 7 Oct (30 Sep + 7d),
    // NOT 28 Sep (old due + 7d) and NOT 5 Oct (skipping ahead by two intervals).
    const lateCall = new Date("2026-09-30T18:00:00Z");
    const due = computeNextDue(lateCall, period, count, new Date(0));
    expect(due.toISOString()).toBe("2026-10-07T18:00:00.000Z");
  });

  it("an early call pulls the whole schedule earlier", () => {
    const earlyCall = new Date("2026-09-16T08:00:00Z"); // 2 days after previous
    const due = computeNextDue(earlyCall, period, count, new Date(0));
    expect(due.toISOString()).toBe("2026-09-23T08:00:00.000Z");
  });

  it("ignores the fallback when a conversation exists", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const due = computeNextDue(last, "month", 1, new Date("2030-01-01T00:00:00Z"));
    expect(due.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("does not mutate its inputs", () => {
    const last = new Date("2026-09-14T10:00:00Z");
    const snapshot = last.getTime();
    computeNextDue(last, "week", 2, new Date());
    expect(last.getTime()).toBe(snapshot);
  });
});

describe("describeFrequency", () => {
  it("reads naturally", () => {
    expect(describeFrequency("week", 1)).toBe("once a week");
    expect(describeFrequency("week", 2)).toBe("2× a week");
    expect(describeFrequency("month", 1)).toBe("once a month");
    expect(describeFrequency("quarter", 3)).toBe("3× a quarter");
  });
});
