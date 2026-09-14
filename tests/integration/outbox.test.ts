import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetOutboxForTests,
  bumpAttempts,
  clear,
  enqueue,
  flush,
  pending,
  type OutboxEntry,
  type SendResult,
} from "@/lib/offline/outbox";

function fresh(): void {
  // New IDB universe per test so nothing leaks between cases.
  globalThis.indexedDB = new IDBFactory();
  __resetOutboxForTests();
}

async function seed(n: number): Promise<OutboxEntry[]> {
  const out: OutboxEntry[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      await enqueue({
        id: `00000000-0000-4000-8000-00000000000${i}`,
        personId: "p1",
        type: i % 2 === 0 ? "completed" : "attempt",
        occurredAt: new Date(Date.UTC(2026, 8, 14, 10, i)).toISOString(),
      }),
    );
    // createdAt is ms-resolution; make ordering deterministic.
    await new Promise((r) => setTimeout(r, 2));
  }
  return out;
}

describe("outbox store", () => {
  beforeEach(fresh);

  it("round-trips entries in creation order", async () => {
    const seeded = await seed(3);
    const list = await pending();
    expect(list.map((e) => e.id)).toEqual(seeded.map((e) => e.id));
    expect(list[0]?.attempts).toBe(0);
  });

  it("bumpAttempts increments in place; clear empties", async () => {
    const [a] = await seed(1);
    await bumpAttempts(a!.id);
    await bumpAttempts(a!.id);
    expect((await pending())[0]?.attempts).toBe(2);
    await clear();
    expect(await pending()).toEqual([]);
  });
});

describe("outbox flush", () => {
  beforeEach(fresh);

  it("sends everything in order and empties the queue", async () => {
    const seeded = await seed(3);
    const sent: string[] = [];
    const summary = await flush(async (e) => {
      sent.push(e.id);
      return "sent";
    });
    expect(sent).toEqual(seeded.map((e) => e.id));
    expect(summary).toEqual({ sent: 3, dropped: 0, remaining: 0 });
    expect(await pending()).toEqual([]);
  });

  it("stops at the first retryable failure and keeps the rest", async () => {
    await seed(4);
    let calls = 0;
    const summary = await flush(async () => {
      calls++;
      return calls === 2 ? "retry" : "sent";
    });
    expect(calls).toBe(2);
    expect(summary).toEqual({ sent: 1, dropped: 0, remaining: 3 });
    const left = await pending();
    expect(left).toHaveLength(3);
    expect(left[0]?.attempts).toBe(1); // the one that failed
    expect(left[1]?.attempts).toBe(0); // never tried
  });

  it("drops permanently-rejected entries without blocking later ones", async () => {
    await seed(3);
    const results: SendResult[] = ["sent", "drop", "sent"];
    const summary = await flush(async () => results.shift()!);
    expect(summary).toEqual({ sent: 2, dropped: 1, remaining: 0 });
    expect(await pending()).toEqual([]);
  });

  it("shares one in-flight run between concurrent callers", async () => {
    await seed(2);
    const send = vi.fn(async (): Promise<SendResult> => {
      await new Promise((r) => setTimeout(r, 5));
      return "sent";
    });
    const [a, b] = await Promise.all([flush(send), flush(send)]);
    expect(a).toBe(b);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("re-runs once the previous flush settles", async () => {
    await seed(1);
    await flush(async () => "retry");
    const second = await flush(async () => "sent");
    expect(second.sent).toBe(1);
    expect(await pending()).toEqual([]);
  });
});
