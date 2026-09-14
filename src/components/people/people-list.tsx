"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client/api";
import { describeFrequency } from "@/lib/interval";
import type { PersonDto } from "@/lib/schemas";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; people: PersonDto[] };

const DAY = 86_400_000;

function dueLabel(iso: string, now = new Date()): string {
  const due = new Date(iso);
  const days = Math.ceil((due.getTime() - now.getTime()) / DAY);
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 14) return `Due in ${days} days`;
  return `Due ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(due)}`;
}

export function PeopleList() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    api<PersonDto[]>("/api/people")
      .then((people) => {
        if (!cancelled) setState({ kind: "ready", people });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <ul className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-xl border border-border p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </li>
        ))}
      </ul>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">Couldn&rsquo;t load your people, try again</p>
      </div>
    );
  }

  if (state.people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-base font-medium">No one yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add the people you want to stay close to.</p>
        <Button asChild className="mt-4 min-h-11">
          <Link href="/people/new">
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add someone
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {state.people.map((p) => (
        <li key={p.id}>
          <Link
            href={`/people/${p.id}`}
            className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium">{p.name}</span>
              <span className="block text-xs text-muted-foreground">
                {describeFrequency(p.frequencyPeriod, p.frequencyCount)} · {dueLabel(p.nextDueAt)}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
