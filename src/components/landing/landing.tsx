import { BellOff, CalendarClock, Clock, Flame, ListChecks, Phone, UserPlus, WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneMock } from "./phone-mock";

const STEPS = [
  {
    icon: UserPlus,
    title: "Add a person and a rhythm",
    body: "Mummy, three times a week. Jija ji, once a fortnight. Their number and timezone, nothing else.",
  },
  {
    icon: ListChecks,
    title: "Open Kin once a day",
    body: "It shows who's due today. Nobody else. If no one is, it says so and leaves you alone.",
  },
  {
    icon: Phone,
    title: "Tap to call, mark it done",
    body: "The name strikes through and their next date moves out. No answer? Log it and try again later.",
  },
] as const;

const QUIET = [
  { icon: Flame, title: "No streaks", body: "There's nothing to keep and nothing to break." },
  { icon: CalendarClock, title: "No backlog", body: "Miss a week and you owe one call, not two. The gap always restarts from your last real conversation." },
  { icon: BellOff, title: "No red", body: "No badges, no alarms, no counters ticking up. One push a day naming who's due, and that's the end of it." },
] as const;

const PRACTICAL = [
  { icon: Clock, title: "Their time, not yours", body: "Every name shows the local time where they are, so you don't ring at two in the morning." },
  { icon: Phone, title: "Your phone's own dialer", body: "Tapping a name opens the Phone app with the number filled in. Kin never makes the call." },
  { icon: WifiOff, title: "Works on the train", body: "Yesterday's list is saved on your phone. Mark calls offline and they sync when you're back." },
] as const;

export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="size-5" fill="currentColor">
                <circle cx="50" cy="34" r="12" />
                <path d="M23 75 A27 27 0 0 1 77 75" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
              </svg>
            </span>
            Kin
          </Link>
          <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-base">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-5 pb-16 pt-8 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-16">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-secondary">One daily list of who to call</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Stay close to the people who matter, one call at a time.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Kin turns &ldquo;I should call Mummy more&rdquo; into a short list each day, based on how
              often you want to talk to each person. Not a streak to keep, not a score to chase.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12">
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12">
                <Link href="/sign-in">I already have an account</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free. Made for iPhone, add it to your Home Screen.</p>
          </div>
          <PhoneMock className="md:justify-self-end" />
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-5xl px-5 py-16 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4 md:flex-col">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                    <h3 className="mt-0.5 text-lg font-medium">{s.title}</h3>
                    <p className="mt-1.5 text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Quiet by design */}
        <section className="mx-auto max-w-5xl px-5 py-16 md:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Quiet by design</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Most habit apps run on guilt. Kin removes the pressure instead of adding to it.
            </p>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {QUIET.map((q) => (
              <li key={q.title} className="rounded-2xl border border-border bg-card p-6">
                <q.icon className="size-5 text-secondary" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-medium">{q.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{q.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* The one rule */}
        <section className="border-y border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-5 py-14 md:py-16">
            <p className="text-sm font-medium opacity-80">The one rule</p>
            <p className="mt-3 max-w-3xl text-2xl font-medium leading-snug md:text-3xl">
              Your next call is always your last real conversation plus the gap you chose. Nothing
              accumulates. Call early and the whole schedule moves earlier. Call late and it simply
              starts again from there.
            </p>
          </div>
        </section>

        {/* Practical */}
        <section className="mx-auto max-w-5xl px-5 py-16 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Made for your phone</h2>
          <ul className="mt-8 grid gap-8 md:grid-cols-3">
            {PRACTICAL.map((p) => (
              <li key={p.title} className="flex gap-4 md:flex-col">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
                  <p.icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-medium">{p.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:py-20">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Who would you call more, if it were easy?</h2>
              <p className="mt-2 text-lg text-muted-foreground">Add them. Kin will tell you when.</p>
            </div>
            <Button asChild size="lg" className="h-12 shrink-0">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Kin. One daily list of who to call.</p>
          <div className="flex gap-5">
            <a href="https://github.com/Parzivalart3mis/kin" className="hover:text-foreground" rel="noreferrer">
              Source on GitHub
            </a>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
