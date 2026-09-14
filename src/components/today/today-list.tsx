"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OutboxSync } from "@/components/app/outbox-sync";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/client/api";
import { submitCall } from "@/lib/client/calls";
import { pending } from "@/lib/offline/outbox";
import { applyPending } from "@/lib/offline/overlay";
import type { PersonWithStatusDto } from "@/lib/schemas";
import { PersonRow } from "./person-row";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; people: PersonWithStatusDto[] };

function sortToday(list: PersonWithStatusDto[]): PersonWithStatusDto[] {
  return [...list].sort((a, b) => {
    if (a.struckToday !== b.struckToday) return a.struckToday ? 1 : -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

const QUEUED_MESSAGE = "Saved. It'll sync when you're back online";

export function TodayList() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // The service worker answers this from cache when offline. Anything
      // still in the outbox is newer than that cache, so overlay it.
      const [people, queue] = await Promise.all([
        api<PersonWithStatusDto[]>("/api/due-today"),
        pending().catch(() => []),
      ]);
      setState({ kind: "ready", people: sortToday(applyPending(people, queue)) });
    } catch (e) {
      const message =
        e instanceof ApiError && e.code === "NETWORK"
          ? "You're offline and today's list isn't saved yet"
          : "Couldn't load your list, try again";
      setState((prev) => (prev.kind === "ready" ? prev : { kind: "error", message }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback((updater: (p: PersonWithStatusDto) => PersonWithStatusDto, id: string) => {
    setState((prev) =>
      prev.kind === "ready"
        ? { ...prev, people: sortToday(prev.people.map((p) => (p.id === id ? updater(p) : p))) }
        : prev,
    );
  }, []);

  const handleDone = useCallback(
    async (person: PersonWithStatusDto) => {
      setBusyId(person.id);
      const occurredAt = new Date().toISOString();
      apply((p) => ({ ...p, struckToday: true }), person.id);
      try {
        const outcome = await submitCall({ personId: person.id, type: "completed", occurredAt });
        if (outcome.queued) {
          toast.message(QUEUED_MESSAGE);
        } else {
          apply(
            (p) => ({
              ...p,
              struckToday: true,
              lastConversationAt: outcome.result.person.lastConversationAt,
              nextDueAt: outcome.result.person.nextDueAt,
            }),
            person.id,
          );
        }
      } catch (e) {
        apply((p) => ({ ...p, struckToday: false }), person.id);
        toast.error(e instanceof ApiError ? e.message : "Couldn't save that, try again");
      } finally {
        setBusyId(null);
      }
    },
    [apply],
  );

  const handleAttempt = useCallback(
    async (person: PersonWithStatusDto) => {
      setBusyId(person.id);
      const occurredAt = new Date().toISOString();
      apply(
        (p) => ({ ...p, attemptsToday: p.attemptsToday + 1, lastAttemptAt: occurredAt }),
        person.id,
      );
      try {
        const outcome = await submitCall({ personId: person.id, type: "attempt", occurredAt });
        if (outcome.queued) toast.message(QUEUED_MESSAGE);
      } catch (e) {
        apply(
          (p) => ({
            ...p,
            attemptsToday: Math.max(0, p.attemptsToday - 1),
            lastAttemptAt: person.lastAttemptAt,
          }),
          person.id,
        );
        toast.error(e instanceof ApiError ? e.message : "Couldn't save that, try again");
      } finally {
        setBusyId(null);
      }
    },
    [apply],
  );

  let body: React.ReactNode;

  if (state.kind === "loading") {
    body = (
      <ul className="space-y-2" aria-busy="true" aria-label="Loading today's list">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-border p-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    );
  } else if (state.kind === "error") {
    body = (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setState({ kind: "loading" });
            void load();
          }}
        >
          Try again
        </Button>
      </div>
    );
  } else if (state.people.length === 0) {
    body = (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-base font-medium">Nobody&rsquo;s due today</p>
        <p className="mt-1 text-sm text-muted-foreground">Come back tomorrow.</p>
      </div>
    );
  } else {
    body = (
      <ul className="space-y-2">
        {state.people.map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            busy={busyId === p.id}
            onDone={handleDone}
            onAttempt={handleAttempt}
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <OutboxSync onSynced={load} />
      {body}
    </>
  );
}
