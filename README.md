# Kin

One daily list of who to call.

Kin turns "I want to stay close to these people" into a single list each day, based on a spacing interval you set per person — *twice a week*, *once a month* — rather than a streak or a quota. It tells you who's due today, once, quietly. No backlog, no guilt, no red.

- **Spacing, not accumulation.** A person's next due date is always `last real conversation + interval`. Miss a week and you owe one call, not two.
- **One tap to dial** via the phone's native dialer (`tel:`).
- **Done** strikes the name through and pushes their next date out. **No answer** logs the attempt and leaves the timer alone.
- **Their local time** next to every name; late-night rows are greyed.
- **One push a day** naming who's due. Nothing else, ever.
- **Works offline.** Yesterday's list is cached; calls you log offline sync when you're back.

Built as an iPhone-first PWA: Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Neon Postgres · Drizzle · Clerk · Web Push · Upstash · Serwist · Vercel.

---

## Local setup

**Prereqs:** Node 24, pnpm 11.

```bash
git clone https://github.com/Parzivalart3mis/kin && cd kin
pnpm install
cp .env.example .env.local     # fill in the values below
pnpm db:migrate                # applies drizzle/ to your Neon DB
pnpm db:seed                   # optional demo people (see below)
pnpm dev                       # http://localhost:3000
```

`pnpm dev` runs Turbopack with the service worker **off** (Serwist only builds under webpack). To test the PWA locally: `pnpm build && pnpm start`.

### Environment variables

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Neon → project → *Connection string* (pooled) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dashboard → *API Keys* |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in`, `/sign-up` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `pnpm vapid:generate` (subject is `mailto:you@…`) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash console → database → *REST API*. Optional locally; rate limiting is a no-op without them. |
| `CRON_SECRET` | Any long random string. Vercel sends it as `Authorization: Bearer …` to the cron route. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional. Sentry runs with `sendDefaultPii: false`; leave blank to disable. |

### Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack, no SW) |
| `pnpm build` / `pnpm start` | Production build (webpack + Serwist) and server |
| `pnpm check` | `typecheck` + `lint` + `test` |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest — unit + PGlite integration + fake-indexeddb |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |
| `pnpm db:seed` | Demo user + 4 people at different frequencies/timezones |
| `pnpm vapid:generate` | Print a VAPID key pair |
| `pnpm icons:generate` | Rebuild `public/icons` + `public/splash` from the inline SVG |

### Seeding

`pnpm db:seed` creates a user with `clerkId = user_demo` and four people (Mummy, Jija ji, Cousin Aarav, Nani). To see them in the app, attach them to **your** Clerk user instead:

```bash
SEED_CLERK_USER_ID=user_2abc…  pnpm db:seed   # your id is in Clerk → Users
```

Re-running updates people in place.

---

## How the pieces fit

```
src/
  app/            routes: (app)/{today,people,settings}, sign-in, offline, api/*
  components/     shadcn/ui primitives + app/today/people/settings components
  db/             Drizzle schema + lazy Neon client
  lib/
    interval.ts   count+period → interval; computeNextDue (the spacing rule)
    tz.ts         Intl-only zone maths: day bounds, local time, night check
    due.ts        today's list: due-or-struck, decorate, plain sort
    schemas.ts    zod for every route; DTO shapes
    services/     people, calls, settings, daily-push (DB access lives here)
    offline/      IndexedDB outbox + overlay onto the cached list
    client/       fetch wrapper, submitCall (outbox fallback), push helpers
  proxy.ts        Clerk middleware (Next 16 calls it proxy)
  app/sw.ts       Serwist service worker
drizzle/          migrations (applied with pnpm db:migrate)
scripts/          seed.ts, generate-icons.mjs
tests/            unit/ + integration/ (PGlite harness applies real migrations)
```

**Due-today rule.** A person is on today's list if `nextDueAt < end of the user's local day` (overdue people are simply "due today" — there is no separate backlog) *or* they were called today (they stay, struck through, until local midnight). Sorting is alphabetical with called people at the bottom — deliberately no "most overdue first".

**Completed vs attempt.** `POST /api/calls {type:"completed"}` sets `lastConversationAt` and recomputes `nextDueAt = lastConversationAt + interval`. `{type:"attempt"}` writes a log row only.

**Offline.** The SW serves `/api/due-today` stale-while-revalidate. Calls logged offline go to an IndexedDB outbox and are replayed on launch / `online` / app-visible with a `clientId` idempotency key (iOS Safari has no Background Sync API, so the app drives the flush). The cached list has the queued calls overlaid so it matches what you did.

**Daily push.** An external scheduler ([cron-job.org](https://cron-job.org)) hits `/api/cron/send-daily` every 15 minutes. Each run pushes to users who are past their notification time (in their zone) and haven't been notified today; `users.last_notified_on` guarantees at most one a day. Quiet days send nothing. The route is cadence-agnostic, so a sparser schedule still works — pushes just land at the first tick after each user's time.

**Auth.** Pages go through Clerk's middleware and redirect to `/sign-in`. API routes call `requireUser()` and answer `401 { error: { code, message } }`. The Clerk user is mirrored into `users` on first request; no webhook needed.

**Logging.** Only `lib/logger.ts` may call `console.*` (ESLint enforces it). Log lines carry IDs and event names, never names or numbers.

---

## Commit / push convention

One commit per numbered build phase, pushed to `main`:

```
Phase 4: core flow — due-today logic, call logging
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests with coverage, and a production build on every push and PR.

---

## Deploying to Vercel

1. `pnpm dlx vercel link` in the repo (or import `Parzivalart3mis/kin` in the Vercel dashboard).
2. Add every variable from `.env.example` in *Settings → Environment Variables*. Generate VAPID keys once with `pnpm vapid:generate`.
3. Push to `main`. The build command is `pnpm build` (already `next build --webpack`).
4. Apply migrations to the production Neon branch: `DATABASE_URL=… pnpm db:migrate`.
5. In Clerk, add the Vercel domain to the allowed origins; in production switch to `pk_live_`/`sk_live_` keys.
6. Set up the scheduler on [cron-job.org](https://cron-job.org):
   - **URL:** `https://<domain>/api/cron/send-daily`
   - **Schedule:** every 15 minutes
   - **Request method:** GET
   - **Headers** (under *Advanced*): `Authorization: Bearer <your CRON_SECRET>`
   - Enable *Save responses* so a failing run is visible; a healthy run returns `{"sent":N,"considered":N,"skippedEmpty":N}`.
7. Verify by hand before trusting the schedule: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/send-daily` — expect `200` and the JSON above; a wrong secret returns `401`.

## PWA install checklist (real iPhone)

Open the deployed URL in Safari → Share → **Add to Home Screen**, then confirm:

- [ ] The icon on the Home Screen is the Kin mark, not a bookmark globe.
- [ ] Launching opens a full-screen app with **no Safari chrome**.
- [ ] The status bar is **black-translucent** and content sits below the notch (header owns the top inset).
- [ ] A splash image shows on cold launch (one per iPhone size is in `public/splash`).
- [ ] Pinch-to-zoom is **disabled** everywhere.
- [ ] Tapping the name, phone, or frequency inputs does **not** auto-zoom (every input is ≥ 16px).
- [ ] Bottom nav sits above the home indicator (nav owns the bottom inset); the last row still scrolls clear of it.
- [ ] Tapping a name opens the Phone app with the number pre-filled.
- [ ] *Settings → Daily reminder* can be turned on **from the installed app** (iOS only allows Web Push from the Home Screen). A test push arrives at your notification time.
- [ ] Airplane mode → reopen Kin → yesterday's list shows; mark someone Done → "Saved. It'll sync…" → airplane mode off → "Synced 1 call".
- [ ] Dark mode follows the phone (or *Settings → Appearance*).

## Out of scope for MVP

Contact photos, transactional email, payments, calendar/maps, streaks or scoring UI of any kind, group calling, SMS.
