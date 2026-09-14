import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Offline outbox for POST /api/calls.
 *
 * Deliberately client-driven (no Background Sync API): iOS Safari never
 * implemented `sync` events, so a service-worker queue would sit there
 * forever on the one device this app is built for. Instead the app flushes
 * on launch, on `online`, and whenever it becomes visible.
 */

export interface OutboxEntry {
  /** uuid — doubles as the server-side idempotency key. */
  id: string;
  personId: string;
  type: "completed" | "attempt";
  occurredAt: string;
  createdAt: number;
  attempts: number;
}

interface KinDB extends DBSchema {
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { byCreated: number };
  };
}

const DB_NAME = "kin";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<KinDB>> | undefined;

function db(): Promise<IDBPDatabase<KinDB>> {
  dbPromise ??= openDB<KinDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore("outbox", { keyPath: "id" });
      store.createIndex("byCreated", "createdAt");
    },
  });
  return dbPromise;
}

export async function enqueue(entry: Omit<OutboxEntry, "createdAt" | "attempts">): Promise<OutboxEntry> {
  const full: OutboxEntry = { ...entry, createdAt: Date.now(), attempts: 0 };
  await (await db()).put("outbox", full);
  return full;
}

export async function pending(): Promise<OutboxEntry[]> {
  return (await db()).getAllFromIndex("outbox", "byCreated");
}

export async function remove(id: string): Promise<void> {
  await (await db()).delete("outbox", id);
}

export async function bumpAttempts(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction("outbox", "readwrite");
  const cur = await tx.store.get(id);
  if (cur) await tx.store.put({ ...cur, attempts: cur.attempts + 1 });
  await tx.done;
}

export async function clear(): Promise<void> {
  await (await db()).clear("outbox");
}

/** Test seam: drop the cached connection so a fresh fake IDB is used. */
export function __resetOutboxForTests(): void {
  dbPromise = undefined;
}

export type SendResult = "sent" | "retry" | "drop";

export interface FlushSummary {
  sent: number;
  dropped: number;
  remaining: number;
}

let inFlight: Promise<FlushSummary> | null = null;

/**
 * Replay queued calls in order. `send` returns:
 *  - "sent"  → remove from the queue
 *  - "drop"  → server rejected it for good (400/404) → remove, don't retry
 *  - "retry" → network/5xx → stop here, keep the rest for next time
 * Concurrent callers share one in-flight flush.
 */
export function flush(send: (entry: OutboxEntry) => Promise<SendResult>): Promise<FlushSummary> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const summary: FlushSummary = { sent: 0, dropped: 0, remaining: 0 };
    const items = await pending();
    for (let i = 0; i < items.length; i++) {
      const entry = items[i]!;
      const result = await send(entry);
      if (result === "sent") {
        await remove(entry.id);
        summary.sent++;
      } else if (result === "drop") {
        await remove(entry.id);
        summary.dropped++;
      } else {
        await bumpAttempts(entry.id);
        summary.remaining = items.length - i;
        break;
      }
    }
    return summary;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
