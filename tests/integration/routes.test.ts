import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import type { User } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { createTestUser, resetTestDb, setupTestDb } from "./harness";

// Swap Clerk for a controllable stub. Each test decides who (if anyone) is signed in.
let currentUser: User | null = null;
vi.mock("@/lib/auth", () => ({
  requireUser: async () => {
    if (!currentUser) throw new AppError("UNAUTHORIZED", "Sign in required");
    return currentUser;
  },
}));

const people = await import("@/app/api/people/route");
const personById = await import("@/app/api/people/[id]/route");
const dueToday = await import("@/app/api/due-today/route");
const calls = await import("@/app/api/calls/route");
const settings = await import("@/app/api/settings/route");
const timezones = await import("@/app/api/timezones/route");
const subscribe = await import("@/app/api/notifications/subscribe/route");

let db: Db;

const BASE = "http://kin.test";

function req(path: string, init?: RequestInit & { json?: unknown }): Request {
  const { json, ...rest } = init ?? {};
  return new Request(`${BASE}${path}`, {
    ...rest,
    headers: { "content-type": "application/json", ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function body<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

const validPerson = {
  name: "Mummy",
  phone: "98765 43210",
  countryCode: "IN",
  timezone: "Asia/Kolkata",
  frequencyCount: 2,
  frequencyPeriod: "week",
};

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb(db);
  currentUser = await createTestUser(db, { timezone: "America/Chicago" });
});

describe("auth + error shape", () => {
  it("returns 401 with the standard shape when signed out", async () => {
    currentUser = null;
    const res = await people.GET(req("/api/people"), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
    expect(await body(res)).toEqual({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
  });

  it("returns 400 VALIDATION naming the field for a bad payload", async () => {
    const res = await people.POST(req("/api/people", { method: "POST", json: { ...validPerson, frequencyCount: 0 } }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
    const b = await body<{ error: { code: string; message: string } }>(res);
    expect(b.error.code).toBe("VALIDATION");
    expect(b.error.message).toMatch(/^frequencyCount: /);
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await people.POST(
      new Request(`${BASE}/api/people`, { method: "POST", body: "{nope", headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await body<{ error: { code: string } }>(res)).error.code).toBe("VALIDATION");
  });

  it("rejects an unknown timezone", async () => {
    const res = await people.POST(req("/api/people", { method: "POST", json: { ...validPerson, timezone: "Mars/Olympus" } }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
  });
});

describe("/api/people", () => {
  it("POST creates, GET lists, PATCH edits, DELETE removes", async () => {
    const created = await people.POST(req("/api/people", { method: "POST", json: validPerson }), { params: Promise.resolve({}) });
    expect(created.status).toBe(201);
    const p = await body<{ id: string; phone: string; nextDueAt: string }>(created);
    expect(p.phone).toBe("+919876543210");

    const list = await body<{ id: string }[]>(await people.GET(req("/api/people"), { params: Promise.resolve({}) }));
    expect(list.map((x) => x.id)).toEqual([p.id]);

    const patched = await personById.PATCH(req(`/api/people/${p.id}`, { method: "PATCH", json: { name: "Amma" } }), ctx(p.id));
    expect(patched.status).toBe(200);
    expect((await body<{ name: string }>(patched)).name).toBe("Amma");

    const deleted = await personById.DELETE(req(`/api/people/${p.id}`, { method: "DELETE" }), ctx(p.id));
    expect(await body(deleted)).toEqual({ success: true });

    const after = await body<unknown[]>(await people.GET(req("/api/people"), { params: Promise.resolve({}) }));
    expect(after).toEqual([]);
  });

  it("PATCH with an empty body is a validation error", async () => {
    const p = await body<{ id: string }>(
      await people.POST(req("/api/people", { method: "POST", json: validPerson }), { params: Promise.resolve({}) }),
    );
    const res = await personById.PATCH(req(`/api/people/${p.id}`, { method: "PATCH", json: {} }), ctx(p.id));
    expect(res.status).toBe(400);
  });

  it("404s on someone else's person", async () => {
    const p = await body<{ id: string }>(
      await people.POST(req("/api/people", { method: "POST", json: validPerson }), { params: Promise.resolve({}) }),
    );
    currentUser = await createTestUser(db);
    const res = await personById.DELETE(req(`/api/people/${p.id}`, { method: "DELETE" }), ctx(p.id));
    expect(res.status).toBe(404);
  });

  it("400s on a malformed id", async () => {
    const res = await personById.DELETE(req("/api/people/not-a-uuid", { method: "DELETE" }), ctx("not-a-uuid"));
    expect(res.status).toBe(400);
  });
});

describe("/api/calls + /api/due-today", () => {
  it("logs a completed call and the person shows struck on today's list", async () => {
    const p = await body<{ id: string }>(
      await people.POST(req("/api/people", { method: "POST", json: validPerson }), { params: Promise.resolve({}) }),
    );
    const res = await calls.POST(req("/api/calls", { method: "POST", json: { personId: p.id, type: "completed" } }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(201);
    const log = await body<{ type: string; person: { nextDueAt: string; lastConversationAt: string } }>(res);
    expect(log.type).toBe("completed");
    expect(new Date(log.person.nextDueAt).getTime() - new Date(log.person.lastConversationAt).getTime()).toBe(3.5 * 86_400_000);

    const today = await body<{ id: string; struckToday: boolean; localTime: string }[]>(
      await dueToday.GET(req("/api/due-today"), { params: Promise.resolve({}) }),
    );
    expect(today).toHaveLength(1);
    expect(today[0]?.struckToday).toBe(true);
    expect(today[0]?.localTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("rejects an unknown call type and a non-uuid personId", async () => {
    const bad1 = await calls.POST(req("/api/calls", { method: "POST", json: { personId: "x", type: "completed" } }), { params: Promise.resolve({}) });
    const bad2 = await calls.POST(req("/api/calls", { method: "POST", json: { personId: crypto.randomUUID(), type: "missed" } }), { params: Promise.resolve({}) });
    expect(bad1.status).toBe(400);
    expect(bad2.status).toBe(400);
  });

  it("404s for a person that doesn't exist", async () => {
    const res = await calls.POST(req("/api/calls", { method: "POST", json: { personId: crypto.randomUUID(), type: "attempt" } }), { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  it("due-today sends no-store so the SW cache is the only cache", async () => {
    const res = await dueToday.GET(req("/api/due-today"), { params: Promise.resolve({}) });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("/api/settings", () => {
  it("GET returns defaults, PATCH validates HH:mm", async () => {
    const got = await body<{ notificationTime: string; timezone: string }>(
      await settings.GET(req("/api/settings"), { params: Promise.resolve({}) }),
    );
    expect(got).toEqual({ notificationTime: "09:00", timezone: "America/Chicago" });

    const bad = await settings.PATCH(req("/api/settings", { method: "PATCH", json: { notificationTime: "9am" } }), { params: Promise.resolve({}) });
    expect(bad.status).toBe(400);

    const ok = await settings.PATCH(req("/api/settings", { method: "PATCH", json: { notificationTime: "20:15" } }), { params: Promise.resolve({}) });
    expect((await body<{ notificationTime: string }>(ok)).notificationTime).toBe("20:15");
  });
});

describe("/api/timezones", () => {
  it("is public and cacheable", async () => {
    currentUser = null;
    const res = await timezones.GET(req("/api/timezones?countryCode=in"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
    expect(await body(res)).toEqual([{ tz: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" }]);
  });

  it("validates the query", async () => {
    const res = await timezones.GET(req("/api/timezones"), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});

describe("/api/notifications/subscribe", () => {
  const sub = { endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } };

  it("upserts by endpoint and DELETE removes it", async () => {
    const a = await subscribe.POST(req("/api/notifications/subscribe", { method: "POST", json: sub }), { params: Promise.resolve({}) });
    expect(await body(a)).toEqual({ success: true });
    await subscribe.POST(req("/api/notifications/subscribe", { method: "POST", json: { ...sub, keys: { p256dh: "p2", auth: "a2" } } }), { params: Promise.resolve({}) });
    const rows = await db.query.pushSubscriptions.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.p256dh).toBe("p2");

    await subscribe.DELETE(req("/api/notifications/subscribe", { method: "DELETE", json: { endpoint: sub.endpoint } }), { params: Promise.resolve({}) });
    expect(await db.query.pushSubscriptions.findMany()).toHaveLength(0);
  });

  it("rejects a non-URL endpoint", async () => {
    const res = await subscribe.POST(req("/api/notifications/subscribe", { method: "POST", json: { ...sub, endpoint: "nope" } }), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});
