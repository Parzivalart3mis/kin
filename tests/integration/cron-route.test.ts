import { beforeEach, describe, expect, it, vi } from "vitest";

const runDailyPush = vi.fn(async () => ({ considered: 2, sent: 1, skippedEmpty: 1 }));
vi.mock("@/lib/services/daily-push", () => ({ runDailyPush }));

const { GET, POST } = await import("@/app/api/cron/send-daily/route");

const URL_ = "http://kin.test/api/cron/send-daily";

beforeEach(() => {
  process.env.CRON_SECRET = "s3cret";
  runDailyPush.mockClear();
});

describe("/api/cron/send-daily", () => {
  it("rejects a missing or wrong bearer token", async () => {
    expect((await GET(new Request(URL_))).status).toBe(401);
    expect((await GET(new Request(URL_, { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    expect(runDailyPush).not.toHaveBeenCalled();
  });

  it("runs with the right token on GET (Vercel) and POST (manual)", async () => {
    const h = { authorization: "Bearer s3cret" };
    const g = await GET(new Request(URL_, { headers: h }));
    expect(g.status).toBe(200);
    expect(await g.json()).toEqual({ sent: 1, considered: 2, skippedEmpty: 1 });
    const p = await POST(new Request(URL_, { method: "POST", headers: h }));
    expect(p.status).toBe(200);
    expect(runDailyPush).toHaveBeenCalledTimes(2);
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(new Request(URL_, { headers: { authorization: "Bearer " } }));
    expect(res.status).toBe(500);
  });
});
