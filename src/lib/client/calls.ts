import { api, ApiError, json } from "@/lib/client/api";
import { enqueue, flush, type OutboxEntry, type FlushSummary } from "@/lib/offline/outbox";
import type { CallLogDto } from "@/lib/schemas";

export interface CallRequest {
  personId: string;
  type: "completed" | "attempt";
  occurredAt: string;
}

export type SubmitOutcome =
  | { queued: false; result: CallLogDto }
  | { queued: true; entry: OutboxEntry };

function newId(): string {
  return crypto.randomUUID();
}

async function post(body: CallRequest & { clientId: string }): Promise<CallLogDto> {
  return api<CallLogDto>("/api/calls", { method: "POST", ...json(body) });
}

function isRetryable(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  return e.code === "NETWORK" || e.status >= 500 || e.code === "RATE_LIMITED";
}

/**
 * Log a call. Online → straight to the API. Offline (or a transient server
 * failure) → into the IndexedDB outbox; the UI treats it as done and the
 * outbox replays it later with the same `clientId`, so it can't double-log.
 */
export async function submitCall(req: CallRequest): Promise<SubmitOutcome> {
  const clientId = newId();
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!offline) {
    try {
      const result = await post({ ...req, clientId });
      return { queued: false, result };
    } catch (e) {
      if (!isRetryable(e)) throw e;
    }
  }
  const entry = await enqueue({ id: clientId, ...req });
  return { queued: true, entry };
}

/** Replay the outbox. Safe to call often; concurrent calls share one run. */
export function flushOutbox(): Promise<FlushSummary> {
  return flush(async (entry) => {
    try {
      await post({
        personId: entry.personId,
        type: entry.type,
        occurredAt: entry.occurredAt,
        clientId: entry.id,
      });
      return "sent";
    } catch (e) {
      if (isRetryable(e)) return "retry";
      // 400/404/401: the server will never accept this one — e.g. the person
      // was deleted on another device. Drop it rather than wedge the queue.
      return "drop";
    }
  });
}
