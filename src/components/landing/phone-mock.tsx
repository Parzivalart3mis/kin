import { Check, Moon, Phone, PhoneMissed } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A static picture of the Today screen, drawn with the same tokens as the
 * real one. No interactivity — it's an illustration.
 */
const ROWS = [
  { name: "Mummy", meta: "20:30 their time", state: "due" },
  { name: "Jija ji", meta: "16:00 their time", note: "No answer at 08:10", state: "due" },
  { name: "Cousin Aarav", meta: "01:00 their time", note: "Probably asleep", state: "night" },
  { name: "Nani", meta: "20:30 their time", state: "done" },
] as const;

export function PhoneMock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative mx-auto w-[280px] select-none rounded-[2.25rem] border-[6px] border-foreground/85 bg-background shadow-[0_30px_60px_-20px_rgb(0_0_0/0.35)] dark:border-muted",
        className,
      )}
    >
      {/* notch */}
      <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground/85 dark:bg-muted" />
      <div className="px-3 pb-4 pt-10">
        <div className="mb-3">
          <p className="text-lg font-semibold leading-tight">Today</p>
          <p className="text-[11px] text-muted-foreground">Monday, 14 September</p>
        </div>
        <ul className="space-y-1.5">
          {ROWS.map((r) => {
            const done = r.state === "done";
            const night = r.state === "night";
            return (
              <li
                key={r.name}
                className={cn(
                  "flex items-stretch gap-1.5 rounded-lg border border-border bg-card",
                  done && "opacity-60",
                  night && "opacity-70",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : <Phone className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className={cn("block truncate text-[13px] font-medium", done && "line-through decoration-muted-foreground/60")}>
                      {r.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {night ? <Moon className="size-2.5" /> : null}
                      {r.meta}
                    </span>
                    {"note" in r ? <span className="block text-[10px] text-muted-foreground">{r.note}</span> : null}
                  </span>
                </div>
                {!done ? (
                  <div className="flex w-[5.4rem] shrink-0 flex-col justify-center gap-1 py-1.5 pr-1.5">
                    <span className="flex h-6 items-center justify-center gap-1 rounded-md bg-primary text-[10px] font-medium text-primary-foreground">
                      <Check className="size-2.5" />
                      Done
                    </span>
                    <span className="flex h-6 items-center justify-center gap-1 rounded-md border border-border text-[10px] text-muted-foreground">
                      <PhoneMissed className="size-2.5" />
                      No answer
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-around border-t border-border pt-2 text-[9px] text-muted-foreground">
          <span className="flex flex-col items-center gap-0.5 text-primary">
            <span className="flex h-4 w-8 items-center justify-center rounded-full bg-primary/12">
              <Phone className="size-3" />
            </span>
            Today
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="flex h-4 w-8 items-center justify-center">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9" /></svg>
            </span>
            People
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="flex h-4 w-8 items-center justify-center">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
            </span>
            Settings
          </span>
        </div>
      </div>
    </div>
  );
}
