import { describe, expect, it } from "vitest";
import type { CallLog, Person } from "@/db/schema";
import { buildTodayList, decorate, isOnTodaysList, logsToday, sortForToday } from "@/lib/due";
import { dayBounds } from "@/lib/tz";

const TZ = "America/Chicago";
const NOW = new Date("2026-09-14T15:00:00Z"); // 10:00 CDT, Mon
const BOUNDS = dayBounds(NOW, TZ);

function person(over: Partial<Person> & { id: string; name: string }): Person {
  return {
    userId: "u1",
    phone: "+10000000000",
    countryCode: "US",
    timezone: TZ,
    frequencyCount: 1,
    frequencyPeriod: "week",
    lastConversationAt: null,
    nextDueAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function log(type: CallLog["type"], iso: string): Pick<CallLog, "type" | "occurredAt"> {
  return { type, occurredAt: new Date(iso) };
}

describe("isOnTodaysList", () => {
  it("includes anyone due before the end of today, including overdue", () => {
    expect(isOnTodaysList({ nextDueAt: new Date("2026-09-01T00:00:00Z") }, false, BOUNDS.end)).toBe(true);
    expect(isOnTodaysList({ nextDueAt: new Date("2026-09-14T23:00:00Z") }, false, BOUNDS.end)).toBe(true);
  });

  it("excludes anyone due tomorrow or later", () => {
    // Local midnight 15 Sep CDT = 05:00Z
    expect(isOnTodaysList({ nextDueAt: new Date("2026-09-15T05:00:00Z") }, false, BOUNDS.end)).toBe(false);
    expect(isOnTodaysList({ nextDueAt: new Date("2026-09-20T00:00:00Z") }, false, BOUNDS.end)).toBe(false);
  });

  it("keeps someone called today even though their next due is now far out", () => {
    expect(isOnTodaysList({ nextDueAt: new Date("2026-09-21T15:00:00Z") }, true, BOUNDS.end)).toBe(true);
  });
});

describe("logsToday", () => {
  it("only counts logs inside the user's local day", () => {
    const r = logsToday(
      [
        log("completed", "2026-09-13T23:00:00Z"), // 18:00 CDT Sunday — yesterday
        log("attempt", "2026-09-14T14:00:00Z"), // 09:00 CDT today
        log("attempt", "2026-09-14T14:30:00Z"),
        log("completed", "2026-09-15T05:00:00Z"), // exactly next midnight — tomorrow
      ],
      BOUNDS,
    );
    expect(r.completed).toBe(false);
    expect(r.attempts).toHaveLength(2);
  });

  it("flags completed when a completed log falls in today", () => {
    const r = logsToday([log("completed", "2026-09-14T14:00:00Z")], BOUNDS);
    expect(r.completed).toBe(true);
  });
});

describe("decorate", () => {
  it("adds local time, night flag, struck state and attempt info", () => {
    const p = person({ id: "p1", name: "Mummy", timezone: "Asia/Kolkata" });
    const d = decorate(
      p,
      [log("attempt", "2026-09-14T13:00:00Z"), log("attempt", "2026-09-14T14:00:00Z")],
      NOW,
      BOUNDS,
    );
    expect(d.localTime).toBe("20:30");
    expect(d.isNight).toBe(false);
    expect(d.struckToday).toBe(false);
    expect(d.attemptsToday).toBe(2);
    expect(d.lastAttemptAt).toBe("2026-09-14T14:00:00.000Z");
  });

  it("marks night in the person's zone", () => {
    const p = person({ id: "p1", name: "Cousin", timezone: "Australia/Sydney" }); // 01:00 AEST
    expect(decorate(p, [], NOW, BOUNDS).isNight).toBe(true);
  });
});

describe("sortForToday", () => {
  it("is alphabetical with struck names at the bottom — no urgency ordering", () => {
    const sorted = sortForToday([
      { name: "Zara", struckToday: false },
      { name: "Anil", struckToday: true },
      { name: "mummy", struckToday: false },
      { name: "Bela", struckToday: false },
    ]);
    expect(sorted.map((s) => s.name)).toEqual(["Bela", "mummy", "Zara", "Anil"]);
  });
});

describe("buildTodayList", () => {
  it("assembles the list end to end", () => {
    const people = [
      person({ id: "due", name: "Jija ji", nextDueAt: new Date("2026-09-14T00:00:00Z") }),
      person({ id: "future", name: "Later", nextDueAt: new Date("2026-09-20T00:00:00Z") }),
      person({ id: "done", name: "Mummy", nextDueAt: new Date("2026-09-21T15:00:00Z") }),
      person({ id: "overdue", name: "Cousin", nextDueAt: new Date("2026-08-01T00:00:00Z") }),
    ];
    const logs = new Map([["done", [log("completed", "2026-09-14T14:30:00Z")]]]);
    const list = buildTodayList(people, logs, NOW, TZ);
    expect(list.map((p) => p.id)).toEqual(["overdue", "due", "done"]);
    expect(list[2]?.struckToday).toBe(true);
  });

  it("attempts keep the person on the list with their timer untouched", () => {
    const p = person({ id: "p", name: "Nani", nextDueAt: new Date("2026-09-14T00:00:00Z") });
    const logs = new Map([["p", [log("attempt", "2026-09-14T14:30:00Z")]]]);
    const [row] = buildTodayList([p], logs, NOW, TZ);
    expect(row?.struckToday).toBe(false);
    expect(row?.attemptsToday).toBe(1);
    expect(row?.nextDueAt).toBe(p.nextDueAt);
  });
});
