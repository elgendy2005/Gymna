# Gymna

A personal online gym coach: a training plan built from your body, goal and health screening, guided workouts with a demo for every exercise, weights that adapt from one session to the next, and progress tracking. Arabic first (RTL) with English, dark first with a light mode, built for phones.

> **Medical disclaimer.** Gymna gives general fitness guidance. It does not replace a doctor, physiotherapist or certified trainer.

## Status

The app is built in phases:

| Phase | Scope | State |
|---|---|---|
| 1 | Project setup, design system, landing page, auth (email/password + Google), Arabic/English routing | Done |
| 2 | Onboarding wizard, BMI, health screening, profile dashboard | Done |
| 3 | Exercise import, library with search and filters, exercise detail with demo and muscle map | Done |
| 4 | Rule-based program engine, weekly plan, rule-based weight engine, tests | Done |
| 5 | Today page, guided workout, finish screen, stats and progress charts | Done |
| 6 | AI coach chat | Cancelled. The coaching in the app is rule-based (see Training logic) |
| 7 | PWA, accessibility and performance pass | Planned |

## Stack

- Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui on Base UI, Motion
- PostgreSQL (Neon) with Prisma 7 and the `pg` driver adapter
- Auth.js v5: credentials (bcrypt) and Google, JWT sessions
- next-intl with `/ar` and `/en` route prefixes
- Zod for forms and server actions

## Setup

Requirements: Node 22 or newer, and a Postgres database. The steps below use a free [Neon](https://neon.tech) project.

1. Install dependencies. This also generates the Prisma client.

   ```bash
   npm install
   ```

2. Create `.env` from the template and fill it in.

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: Neon's **pooled** connection string (host contains `-pooler`).
   - `DATABASE_URL_UNPOOLED`: Neon's **direct** connection string. Prisma migrations use it.
   - `npx neon init` fills in both database values for you.
   - `AUTH_SECRET`: run `npx auth secret`, or `openssl rand -base64 33`.
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: optional. The Google button only shows when both are set. Redirect URI: `http://localhost:3000/api/auth/callback/google`.

3. Create the tables.

   ```bash
   npm run db:deploy
   ```

4. Load the exercise library (876 exercises). Safe to run again.

   ```bash
   npm run db:seed
   ```

5. Start the app and open http://localhost:3000.

   ```bash
   npm run dev
   ```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then runs `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run db:migrate` | Create and apply a migration during development |
| `npm run db:deploy` | Apply existing migrations |
| `npm run db:seed` | Load or refresh the exercise library |
| `npm run db:studio` | Prisma Studio |

## Architecture

```
messages/            ar.json, en.json: every UI string
prisma/              schema, migrations
  seed/              exercise dataset snapshot, curated enrichment, seed script
public/exercise-media/  demo photos, one folder per exercise
scripts/             one-off tools (media conversion)
src/
  app/[locale]/      pages; the locale segment is the root layout
    (marketing)/     landing page
    (auth)/          login, signup
    (app)/           signed-in pages
  app/api/           route handlers (Auth.js)
  components/        ui/ (shadcn), layout/, landing/, auth/, onboarding/, exercise/, plan/,
                     today/, workout/, progress/, settings/, shared/
  i18n/              routing, navigation helpers, request config
  lib/               framework-free code: validation schemas, schedule and streak rules,
    program-engine/  answers -> weekly plan
    weight-engine/   history -> weight, reps and a reason for each exercise
  server/            db client, auth, session helpers, queries/, actions/, and the code
                     that joins the engines to the database (plan, coach, workout)
  proxy.ts           locale routing and an optimistic signed-in check
```

Things worth knowing before changing code:

- **Locale** comes from the `[locale]` root segment through `next/root-params`, so pages can be prerendered. Root params are not readable in server actions or route handlers; those return error codes and the client translates them.
- **Auth checks** happen on the server in `requireUser()` and in every server action. `proxy.ts` only looks for a session cookie to skip a wasted render.
- **Session reads are request-time data.** With Cache Components they must sit inside a `<Suspense>` boundary, as the Today page shows.
- **RTL** uses logical utilities (`ms-`, `pe-`, `start-`, `end-`). Avoid `ml-`, `pr-`, `left-`, `right-`.
- **Color tokens** live in `src/app/globals.css`. `brand` is the lime fill and always carries dark text; `brand-text` is the accent used as text and changes per theme to keep contrast.
- **Fonts**: Sora for Latin and IBM Plex Sans Arabic for Arabic. The root layout puts only the primary family names in the font stack, because next/font's Arial fallback face would otherwise render the Arabic text.

## Training logic

Two rule-based engines in `src/lib` hold the coaching logic. Both are pure functions with no database or React imports, and both have their own test suites.

- **Program engine** (`program-engine/`): `generatePlan(profile, exercises)` picks the split from the days per week, fills each day's slots from the curated exercises the user can do (equipment, level, health tags), sets sets, reps and rest by goal, trims the day to the session length and adds volume for focus areas. The same answers always give the same plan; the seed stored with the plan only settles ties. `ENGINE_VERSION` rebuilds saved plans when the rules change.
- **Weight engine** (`weight-engine/`): `recommend(...)` returns the weight, rep range, a reason code and warm-up sets. The first time, it estimates from the lifts given at onboarding, then from related lifts, then from body weight, and marks the session as calibration. After that it is double progression: more reps until every set reaches the top of the range, then more weight; hold after a miss, 10% off after two, a deload after a stall. `adjustAfterSet` corrects the remaining sets inside a session. Every number lives in `config.ts`.
- **Weights are stored in kg**, whatever the display unit, and dumbbell weights are per dumbbell. Rounding to what can be loaded (2.5 kg or 5 lb barbell steps, the gym's dumbbell and stack steps from settings) happens in `rounding.ts`.
- **A plan is a snapshot** (`Plan`, `PlanDay`, `PlanExercise`) rebuilt only when the answers change. **A workout is a copy**: starting one copies the day's exercises and that day's suggestions into `WorkoutSession` rows, so later plan changes, swaps and skips never rewrite history.
- **Suggestions are computed from `SetLog` history** each time. `ExerciseStat` only caches records and the current estimated max.
- **The workout screen is optimistic**: each tap updates the screen and a server action saves it, so the database is the source of truth and a refresh resumes the session. Only the open card and the rest timer's end time live in `localStorage`.
- **"Today" follows the user's time zone** (saved at onboarding). The training week runs Saturday to Friday; weekday 0 is Saturday everywhere (`src/lib/schedule.ts`).
- **Reason and cooldown lines** are in `messages/*.json` under `Coach.reasons` and `Finish.cooldown`, three wordings each; tests check both languages have all of them.
- **`getCoachContext(userId)` is unused for now.** It lives in `src/server/coach-context.ts` (built by `src/lib/coach-context.ts`) and was written for the cancelled AI coach: it returns the profile, plan, today's suggestions, recent workouts and estimated maxes as text, and passes on movement tags to avoid, never the health answers themselves. It is kept, with its tests, in case a chat coach is picked up again. Do not confuse it with `src/server/coach.ts`, which computes the weight suggestions and is in use.

## Exercise data

Exercises come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, public domain). A snapshot lives in `prisma/seed/data` and its photos, converted to WebP, in `public/exercise-media`, so the app never calls a third party at runtime. ExerciseDB was ruled out because its API terms forbid storing its data.

- **All 876 exercises** are browsable in the library with English names and instructions.
- **A curated core set of 130** (`prisma/seed/enrichment/`) adds an Arabic name and cues, a movement pattern, common mistakes, breathing, extra kit needed and health tags. Only these are marked `engineEligible`, so the program engine in Phase 4 builds plans from them alone.
- **Health tags** match the ones the health screening produces (`src/lib/health.ts`). The exercise page warns a user when an exercise carries a tag from their own screening.
- **Demos** are `ExerciseMedia` rows. Today each is a two-photo frame sequence that the player loops; a GIF or video row with a higher `priority` replaces it with no code change. Lottie rows are stored but not played yet.
- **Search** runs in the browser over the whole index (`src/lib/exercise-search.ts`) and folds Arabic spelling variants and diacritics. Filters are mirrored in the URL.
- To change curated content, edit `prisma/seed/enrichment/curated.ts` or `patterns.ts` and run `npm run db:seed`. To rebuild the photos, run `node scripts/import-exercise-media.mjs <free-exercise-db checkout>`.
- The muscle map outline is adapted from [react-body-highlighter](https://github.com/giavinh79/react-body-highlighter) (MIT).

## Screenshots

To be added as pages are completed.
