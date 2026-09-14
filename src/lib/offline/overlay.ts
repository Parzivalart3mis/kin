import type { PersonWithStatusDto } from "@/lib/schemas";
import type { OutboxEntry } from "./outbox";

/**
 * The cached /api/due-today response predates anything still in the outbox.
 * Project queued calls onto it so the list the user sees offline matches what
 * they did offline.
 */
export function applyPending(
  list: PersonWithStatusDto[],
  queue: readonly OutboxEntry[],
): PersonWithStatusDto[] {
  if (queue.length === 0) return list;
  const byPerson = new Map<string, OutboxEntry[]>();
  for (const e of queue) {
    const bucket = byPerson.get(e.personId);
    if (bucket) bucket.push(e);
    else byPerson.set(e.personId, [e]);
  }
  return list.map((p) => {
    const entries = byPerson.get(p.id);
    if (!entries) return p;
    let next = p;
    for (const e of entries) {
      if (e.type === "completed") {
        next = { ...next, struckToday: true, lastConversationAt: e.occurredAt };
      } else {
        const later = !next.lastAttemptAt || e.occurredAt > next.lastAttemptAt;
        next = {
          ...next,
          attemptsToday: next.attemptsToday + 1,
          lastAttemptAt: later ? e.occurredAt : next.lastAttemptAt,
        };
      }
    }
    return next;
  });
}
