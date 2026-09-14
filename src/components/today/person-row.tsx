"use client";

import { Check, Moon, Phone, PhoneMissed } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatForDisplay, telHref } from "@/lib/phone";
import type { PersonWithStatusDto } from "@/lib/schemas";

interface Props {
  person: PersonWithStatusDto;
  busy: boolean;
  onDone: (person: PersonWithStatusDto) => void;
  onAttempt: (person: PersonWithStatusDto) => void;
}

function attemptLabel(p: PersonWithStatusDto): string | null {
  if (p.attemptsToday === 0 || !p.lastAttemptAt) return null;
  const t = new Date(p.lastAttemptAt);
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return p.attemptsToday === 1 ? `No answer at ${hh}:${mm}` : `${p.attemptsToday} tries, last ${hh}:${mm}`;
}

export function PersonRow({ person, busy, onDone, onAttempt }: Props) {
  const struck = person.struckToday;
  const attempt = attemptLabel(person);

  return (
    <li
      className={cn(
        "flex items-stretch gap-2 rounded-xl border border-border bg-card transition-opacity",
        struck && "opacity-60",
        !struck && person.isNight && "opacity-70",
      )}
      aria-label={struck ? `${person.name}, called today` : undefined}
    >
      <a
        href={telHref(person.phone)}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-l-xl px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Call ${person.name}`}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            struck ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          {struck ? <Check className="size-5" /> : <Phone className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-base font-medium",
              struck && "line-through decoration-2 decoration-muted-foreground/60",
            )}
          >
            {person.name}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {person.isNight ? <Moon className="size-3" aria-hidden="true" /> : null}
            <span>
              {person.localTime}
              {person.isNight ? " their time, probably asleep" : " their time"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{formatForDisplay(person.phone)}</span>
          </span>
          {attempt ? (
            <span className="block text-xs text-muted-foreground">{attempt}</span>
          ) : null}
        </span>
      </a>

      {!struck ? (
        <div className="flex shrink-0 flex-col justify-center gap-1 pr-2 py-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDone(person)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 select-none"
            aria-label={`Mark ${person.name} as called`}
          >
            <Check className="size-4" aria-hidden="true" />
            Done
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAttempt(person)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-border px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 select-none"
            aria-label={`Log no answer from ${person.name}`}
          >
            <PhoneMissed className="size-4" aria-hidden="true" />
            No answer
          </button>
        </div>
      ) : null}
    </li>
  );
}
