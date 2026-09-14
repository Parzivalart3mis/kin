import { describe, expect, it } from "vitest";
import type { OutboxEntry } from "@/lib/offline/outbox";
import { applyPending } from "@/lib/offline/overlay";
import type { PersonWithStatusDto } from "@/lib/schemas";

function person(id: string, over: Partial<PersonWithStatusDto> = {}): PersonWithStatusDto {
  return {
    id,
    name: id,
    phone: "+10000000000",
    countryCode: "US",
    timezone: "UTC",
    frequencyCount: 1,
    frequencyPeriod: "week",
    lastConversationAt: null,
    nextDueAt: "2026-09-14T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    localTime: "10:00",
    isNight: false,
    struckToday: false,
    attemptsToday: 0,
    lastAttemptAt: null,
    ...over,
  };
}

function entry(personId: string, type: OutboxEntry["type"], occurredAt: string): OutboxEntry {
  return { id: crypto.randomUUID(), personId, type, occurredAt, createdAt: 0, attempts: 0 };
}

describe("applyPending", () => {
  it("returns the same list when the queue is empty", () => {
    const list = [person("a")];
    expect(applyPending(list, [])).toBe(list);
  });

  it("strikes a person with a queued completed call", () => {
    const out = applyPending([person("a"), person("b")], [entry("a", "completed", "2026-09-14T10:00:00.000Z")]);
    expect(out[0]?.struckToday).toBe(true);
    expect(out[0]?.lastConversationAt).toBe("2026-09-14T10:00:00.000Z");
    expect(out[1]?.struckToday).toBe(false);
  });

  it("counts queued attempts and keeps the latest time", () => {
    const out = applyPending(
      [person("a", { attemptsToday: 1, lastAttemptAt: "2026-09-14T08:00:00.000Z" })],
      [entry("a", "attempt", "2026-09-14T09:00:00.000Z"), entry("a", "attempt", "2026-09-14T08:30:00.000Z")],
    );
    expect(out[0]?.attemptsToday).toBe(3);
    expect(out[0]?.lastAttemptAt).toBe("2026-09-14T09:00:00.000Z");
  });

  it("ignores queue entries for people not on the list", () => {
    const out = applyPending([person("a")], [entry("zzz", "completed", "2026-09-14T10:00:00.000Z")]);
    expect(out[0]?.struckToday).toBe(false);
  });
});
