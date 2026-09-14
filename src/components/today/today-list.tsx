"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client/api";
import { submitCall } from "@/lib/client/calls";
import type { PersonWithStatusDto } from "@/lib/schemas";
import { PersonRow } from "./person-row";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; people: PersonWithStatusDto[]; stale: boolean };

function sortToday(list: PersonWithStatusDto[]): PersonWithStatusDto[] {
  return [...list].sort((a, b) => {
    if (a.struckToday !== b.struckToday) return a.struckToday ? 1 : -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function TodayList() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const people = await api<PersonWithStatusDto[]>("/api/due-today");
      setState({ kind: "ready", people: sortToday(people), stale: false });
    } catch (e) {
      const message =
        e instanceof ApiError && e.code === "NETWORK"
          ? "You're offline and nothing is cached yet"
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
        const res = await submitCall({ personId: person.id, type: "completed", occurredAt });
        apply(
          (p) => ({
            ...p,
            struckToday: true,
            lastConversationAt: res.person.lastConversationAt,
            nextDueAt: res.person.nextDueAt,
          }),
          person.id,
        );
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
        await submitCall({ personId: person.id, type: "attempt", occurredAt });
      } catch (e) {
        apply(
          (p) => ({ ...p, attemptsToday: Math.max(0, p.attemptsToday - 1), lastAttemptAt: person.lastAttemptAt }),
          person.id,
        );
        toast.error(e instanceof ApiError ? e.message : "Couldn't save that, try again");
      } finally {
        setBusyId(null);
      }
    },
    [apply],
  );

  if (state.kind === "loading") {
    return (
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
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button variant="outline" className="mt-4 min-h-11" onClick={() => { setState({ kind: "loading" }); void load(); }}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-base font-medium">Nobody&rsquo;s due today</p>
        <p className="mt-1 text-sm text-muted-foreground">Come back tomorrow.</p>
      </div>
    );
  }

  return (
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
