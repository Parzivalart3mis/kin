import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import type { User } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { getTodayList, logCall } from "@/lib/services/calls";
import { createPerson, deletePerson, listPeople, updatePerson } from "@/lib/services/people";
import { updateSettings } from "@/lib/services/settings";
import { createTestUser, resetTestDb, setupTestDb } from "./harness";

let db: Db;
let user: User;
let other: User;

const DAY = 86_400_000;
const T0 = new Date("2026-09-14T15:00:00Z"); // Mon 10:00 Chicago

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb(db);
  user = await createTestUser(db, { timezone: "America/Chicago" });
  other = await createTestUser(db, { timezone: "Asia/Kolkata" });
});

describe("people service", () => {
  it("creates with a normalised phone and an immediate due date", async () => {
    const p = await createPerson(
      user.id,
      { name: "Mummy", phone: "98765 43210", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 2, frequencyPeriod: "week" },
      T0,
    );
    expect(p.phone).toBe("+919876543210");
    expect(p.lastConversationAt).toBeNull();
    expect(p.nextDueAt.getTime()).toBe(T0.getTime());
  });

  it("rejects an unparseable phone with a VALIDATION error", async () => {
    await expect(
      createPerson(user.id, { name: "X", phone: "nope", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 1, frequencyPeriod: "week" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("scopes reads and writes to the owning user", async () => {
    const p = await createPerson(user.id, { name: "A", phone: "3125550142", countryCode: "US", timezone: "America/Chicago", frequencyCount: 1, frequencyPeriod: "week" });
    expect(await listPeople(other.id)).toHaveLength(0);
    await expect(updatePerson(other.id, p.id, { name: "B" })).rejects.toBeInstanceOf(AppError);
    await expect(deletePerson(other.id, p.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listPeople(user.id)).toHaveLength(1);
  });

  it("re-derives nextDueAt from lastConversationAt when frequency changes", async () => {
    const p = await createPerson(user.id, { name: "A", phone: "3125550142", countryCode: "US", timezone: "America/Chicago", frequencyCount: 1, frequencyPeriod: "week" }, T0);
    await logCall(user, p.id, "completed", T0);
    const updated = await updatePerson(user.id, p.id, { frequencyPeriod: "month" });
    expect(updated.nextDueAt.getTime()).toBe(T0.getTime() + 30 * DAY);
  });

  it("keeps the existing due date when frequency changes with no conversation yet", async () => {
    const p = await createPerson(user.id, { name: "A", phone: "3125550142", countryCode: "US", timezone: "America/Chicago", frequencyCount: 1, frequencyPeriod: "week" }, T0);
    const updated = await updatePerson(user.id, p.id, { frequencyCount: 3 });
    expect(updated.nextDueAt.getTime()).toBe(T0.getTime());
  });
});

describe("calls service", () => {
  async function seed(name = "Mummy") {
    return createPerson(user.id, { name, phone: "98765 43210", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 1, frequencyPeriod: "week" }, T0);
  }

  it("completed: logs, sets lastConversationAt, pushes nextDueAt out by one interval", async () => {
    const p = await seed();
    const { log, person } = await logCall(user, p.id, "completed", T0);
    expect(log.type).toBe("completed");
    expect(person.lastConversationAt?.getTime()).toBe(T0.getTime());
    expect(person.nextDueAt.getTime()).toBe(T0.getTime() + 7 * DAY);
  });

  it("attempt: logs only, timer untouched", async () => {
    const p = await seed();
    const { person } = await logCall(user, p.id, "attempt", T0);
    expect(person.lastConversationAt).toBeNull();
    expect(person.nextDueAt.getTime()).toBe(T0.getTime());
  });

  it("never accumulates: a call 10 days late schedules from the call", async () => {
    const p = await seed();
    const late = new Date(T0.getTime() + 17 * DAY);
    const { person } = await logCall(user, p.id, "completed", late);
    expect(person.nextDueAt.getTime()).toBe(late.getTime() + 7 * DAY);
  });

  it("out-of-order offline replay never moves lastConversationAt backwards", async () => {
    const p = await seed();
    const later = new Date(T0.getTime() + 2 * DAY);
    await logCall(user, p.id, "completed", later);
    const { person } = await logCall(user, p.id, "completed", T0);
    expect(person.lastConversationAt?.getTime()).toBe(later.getTime());
    expect(person.nextDueAt.getTime()).toBe(later.getTime() + 7 * DAY);
  });

  it("refuses to log against someone else's person", async () => {
    const p = await seed();
    await expect(logCall(other, p.id, "completed")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("getTodayList", () => {
  it("returns due + struck people, sorted plainly, with status", async () => {
    const a = await createPerson(user.id, { name: "Zed", phone: "3125550142", countryCode: "US", timezone: "America/Chicago", frequencyCount: 1, frequencyPeriod: "week" }, T0);
    const b = await createPerson(user.id, { name: "Amma", phone: "98765 43210", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 1, frequencyPeriod: "week" }, T0);
    const c = await createPerson(user.id, { name: "Future", phone: "3125550143", countryCode: "US", timezone: "America/Chicago", frequencyCount: 1, frequencyPeriod: "week" }, T0);
    await logCall(user, c.id, "completed", new Date(T0.getTime() - 3 * DAY)); // due in 4 days → not today
    await logCall(user, b.id, "completed", new Date(T0.getTime() - 30 * 60_000)); // called 30 min ago → struck
    await logCall(user, a.id, "attempt", new Date(T0.getTime() - 60 * 60_000));

    const list = await getTodayList(user, T0);
    expect(list.map((p) => p.name)).toEqual(["Zed", "Amma"]);
    const zed = list[0];
    const amma = list[1];
    expect(zed?.attemptsToday).toBe(1);
    expect(zed?.struckToday).toBe(false);
    expect(amma?.struckToday).toBe(true);
    expect(amma?.localTime).toBe("20:30");
    expect(amma?.isNight).toBe(false);
  });

  it("uses the user's own timezone for 'today'", async () => {
    // 15:00Z = 20:30 IST. A call at 19:00Z *yesterday* Chicago (= 00:30 IST today) is
    // "today" for the Kolkata user but "yesterday" for the Chicago user.
    const kolkata = await createTestUser(db, { timezone: "Asia/Kolkata" });
    const p = await createPerson(kolkata.id, { name: "A", phone: "98765 43210", countryCode: "IN", timezone: "Asia/Kolkata", frequencyCount: 1, frequencyPeriod: "week" }, T0);
    await logCall(kolkata, p.id, "completed", new Date("2026-09-13T19:00:00Z"));
    const list = await getTodayList(kolkata, T0);
    expect(list).toHaveLength(1);
    expect(list[0]?.struckToday).toBe(true);
  });

  it("is empty for a user with no people", async () => {
    expect(await getTodayList(user, T0)).toEqual([]);
  });
});

describe("settings service", () => {
  it("updates only the provided fields", async () => {
    const u1 = await updateSettings(user, { notificationTime: "07:30" });
    expect(u1.notificationTime).toBe("07:30");
    expect(u1.timezone).toBe("America/Chicago");
    const u2 = await updateSettings(u1, { timezone: "Europe/London" });
    expect(u2.notificationTime).toBe("07:30");
    expect(u2.timezone).toBe("Europe/London");
  });
});
