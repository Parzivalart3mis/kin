import { describe, expect, it } from "vitest";
import {
  dayBounds,
  isNightAt,
  isNightHour,
  isValidTimeZone,
  localDateKey,
  localTimeString,
  parseHHmm,
  tzOffsetMs,
  zonedTimeToUtc,
} from "@/lib/tz";

describe("wall clock reads", () => {
  it("localTimeString formats HH:mm in the zone", () => {
    const t = new Date("2026-09-14T12:30:00Z");
    expect(localTimeString(t, "UTC")).toBe("12:30");
    expect(localTimeString(t, "Asia/Kolkata")).toBe("18:00");
    expect(localTimeString(t, "America/Chicago")).toBe("07:30"); // CDT
  });

  it("localDateKey rolls over at the zone's midnight", () => {
    const t = new Date("2026-09-14T20:00:00Z");
    expect(localDateKey(t, "UTC")).toBe("2026-09-14");
    expect(localDateKey(t, "Asia/Kolkata")).toBe("2026-09-15"); // 01:30 next day
  });

  it("tzOffsetMs is signed and DST-aware", () => {
    expect(tzOffsetMs(new Date("2026-09-14T12:00:00Z"), "Asia/Kolkata")).toBe(5.5 * 3_600_000);
    expect(tzOffsetMs(new Date("2026-07-01T12:00:00Z"), "America/New_York")).toBe(-4 * 3_600_000);
    expect(tzOffsetMs(new Date("2026-01-01T12:00:00Z"), "America/New_York")).toBe(-5 * 3_600_000);
  });
});

describe("zonedTimeToUtc", () => {
  it("maps local midnight to the right instant", () => {
    expect(zonedTimeToUtc(2026, 9, 14, 0, 0, "Asia/Kolkata").toISOString()).toBe(
      "2026-09-13T18:30:00.000Z",
    );
    expect(zonedTimeToUtc(2026, 9, 14, 9, 0, "America/Chicago").toISOString()).toBe(
      "2026-09-14T14:00:00.000Z",
    );
  });

  it("handles a spring-forward day (23h) without drifting", () => {
    // US DST 2026 starts 8 Mar 02:00 → 03:00 local.
    const before = zonedTimeToUtc(2026, 3, 8, 0, 0, "America/New_York");
    const after = zonedTimeToUtc(2026, 3, 9, 0, 0, "America/New_York");
    expect((after.getTime() - before.getTime()) / 3_600_000).toBe(23);
  });
});

describe("dayBounds", () => {
  it("covers exactly one local day", () => {
    const now = new Date("2026-09-14T03:00:00Z"); // 08:30 IST
    const { start, end } = dayBounds(now, "Asia/Kolkata");
    expect(start.toISOString()).toBe("2026-09-13T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-14T18:30:00.000Z");
  });

  it("is 25h on a fall-back day", () => {
    // US DST 2026 ends 1 Nov.
    const { start, end } = dayBounds(new Date("2026-11-01T12:00:00Z"), "America/New_York");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
});

describe("night detection", () => {
  it("flags 21:00–07:59 as night", () => {
    expect(isNightHour(21)).toBe(true);
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(7)).toBe(true);
    expect(isNightHour(8)).toBe(false);
    expect(isNightHour(20)).toBe(false);
  });

  it("uses the person's zone, not the caller's", () => {
    const t = new Date("2026-09-14T17:00:00Z"); // 22:30 IST, 12:00 CDT
    expect(isNightAt(t, "Asia/Kolkata")).toBe(true);
    expect(isNightAt(t, "America/Chicago")).toBe(false);
  });
});

describe("misc", () => {
  it("validates zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });

  it("parses HH:mm strictly", () => {
    expect(parseHHmm("09:05")).toEqual({ hour: 9, minute: 5 });
    expect(() => parseHHmm("9:05")).toThrow();
    expect(() => parseHHmm("24:00")).toThrow();
    expect(() => parseHHmm("12:60")).toThrow();
  });
});
