import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { createTestUser, resetTestDb, setupTestDb } from "./harness";

import type { PushSubscription } from "@/db/schema";
import type { PushPayload } from "@/lib/push";

const sendPush = vi.fn<(sub: PushSubscription, payload: PushPayload) => Promise<boolean>>(async () => true);
vi.mock("@/lib/push", () => ({
  sendPush: (sub: PushSubscription, payload: PushPayload) => sendPush(sub, payload),
  pushConfigured: () => true,
}));

const { composeBody, isPastNotificationTime, runDailyPush } = await import("@/lib/services/daily-push");
const { createPerson } = await import("@/lib/services/people");
const { logCall } = await import("@/lib/services/calls");

let db: Db;

// 15:00Z = 10:00 Chicago = 20:30 Kolkata
const NOW = new Date("2026-09-14T15:00:00Z");

async function subscribed(over: { timezone: string; notificationTime: string }) {
  const u = await createTestUser(db, over);
  await db.insert(pushSubscriptions).values({ userId: u.id, endpoint: `https://push.example/${u.id}`, p256dh: "p", auth: "a" });
  return u;
}

async function withPerson(userId: string, name: string) {
  return createPerson(userId, { name, phone: "3125550142", countryCode: "US", timezone: "America/Chicago", frequencyCount: 1, frequencyPeriod: "week" }, NOW);
}

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb(db);
  sendPush.mockClear();
});

describe("composeBody", () => {
  it("names people plainly, no exclamation marks", () => {
    expect(composeBody([])).toBe("");
    expect(composeBody(["Mummy"])).toBe("Time to call Mummy");
    expect(composeBody(["Mummy", "Jija ji"])).toBe("Time to call Mummy and Jija ji");
    expect(composeBody(["Mummy", "Jija ji", "Nani"])).toBe("Time to call Mummy, Jija ji and 1 other");
    expect(composeBody(["A", "B", "C", "D"])).toBe("Time to call A, B and 2 others");
    expect(composeBody(["A", "B", "C", "D"])).not.toMatch(/!/);
  });
});

describe("isPastNotificationTime", () => {
  it("compares in the user's zone", () => {
    expect(isPastNotificationTime({ timezone: "America/Chicago", notificationTime: "09:00" }, NOW)).toBe(true);
    expect(isPastNotificationTime({ timezone: "America/Chicago", notificationTime: "10:00" }, NOW)).toBe(true);
    expect(isPastNotificationTime({ timezone: "America/Chicago", notificationTime: "10:01" }, NOW)).toBe(false);
    expect(isPastNotificationTime({ timezone: "Asia/Kolkata", notificationTime: "20:00" }, NOW)).toBe(true);
    expect(isPastNotificationTime({ timezone: "Asia/Kolkata", notificationTime: "21:00" }, NOW)).toBe(false);
  });
});

describe("runDailyPush", () => {
  it("sends once to a due user past their time, then never again that day", async () => {
    const u = await subscribed({ timezone: "America/Chicago", notificationTime: "09:00" });
    await withPerson(u.id, "Mummy");
    await withPerson(u.id, "Jija ji");

    const first = await runDailyPush(NOW);
    expect(first).toEqual({ considered: 1, sent: 1, skippedEmpty: 0 });
    expect(sendPush).toHaveBeenCalledTimes(1);
    const payload = sendPush.mock.calls[0]![1];
    expect(payload.body).toBe("Time to call Jija ji and Mummy");
    expect(payload.tag).toBe("kin-daily-2026-09-14");

    const again = await runDailyPush(new Date(NOW.getTime() + 15 * 60_000));
    expect(again).toEqual({ considered: 0, sent: 0, skippedEmpty: 0 });
    expect(sendPush).toHaveBeenCalledTimes(1);
  });

  it("waits until the user's notification time", async () => {
    const u = await subscribed({ timezone: "America/Chicago", notificationTime: "18:00" });
    await withPerson(u.id, "Mummy");
    expect(await runDailyPush(NOW)).toEqual({ considered: 0, sent: 0, skippedEmpty: 0 });
    // 23:30Z = 18:30 Chicago
    expect(await runDailyPush(new Date("2026-09-14T23:30:00Z"))).toMatchObject({ sent: 1 });
  });

  it("stays quiet when nobody is due, and still marks the day done", async () => {
    const u = await subscribed({ timezone: "America/Chicago", notificationTime: "09:00" });
    const p = await withPerson(u.id, "Mummy");
    await logCall(u, p.id, "completed", new Date(NOW.getTime() - 60_000)); // called a minute ago → struck
    expect(await runDailyPush(NOW)).toEqual({ considered: 1, sent: 0, skippedEmpty: 1 });
    expect(sendPush).not.toHaveBeenCalled();
    expect(await runDailyPush(new Date(NOW.getTime() + 60_000))).toEqual({ considered: 0, sent: 0, skippedEmpty: 0 });
  });

  it("ignores users with no push subscription", async () => {
    const u = await createTestUser(db, { timezone: "America/Chicago", notificationTime: "09:00" });
    await withPerson(u.id, "Mummy");
    expect(await runDailyPush(NOW)).toEqual({ considered: 0, sent: 0, skippedEmpty: 0 });
  });

  it("sends again on the next local day", async () => {
    const u = await subscribed({ timezone: "America/Chicago", notificationTime: "09:00" });
    await withPerson(u.id, "Mummy");
    await runDailyPush(NOW);
    const tomorrow = new Date("2026-09-15T15:00:00Z");
    expect(await runDailyPush(tomorrow)).toMatchObject({ sent: 1 });
    expect(sendPush).toHaveBeenCalledTimes(2);
  });

  it("pushes to every device the user has", async () => {
    const u = await subscribed({ timezone: "America/Chicago", notificationTime: "09:00" });
    await db.insert(pushSubscriptions).values({ userId: u.id, endpoint: "https://push.example/second", p256dh: "p", auth: "a" });
    await withPerson(u.id, "Mummy");
    await runDailyPush(NOW);
    expect(sendPush).toHaveBeenCalledTimes(2);
  });
});
