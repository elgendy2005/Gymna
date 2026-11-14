# Gymna

A personal online gym coach: a training plan built from your body, goal and health screening, guided workouts with a demo for every exercise, progress tracking, and an AI coach on chat. Arabic first (RTL) with English, dark first with a light mode, built for phones.

> **Medical disclaimer.** Gymna gives general fitness guidance. It does not replace a doctor, physiotherapist or certified trainer.

## Status

The app is built in phases. Done so far:

| Phase | Scope | State |
|---|---|---|
| 1 | Project setup, design system, landing page, auth (email/password + Google), Arabic/English routing | Done |
| 2 | Onboarding wizard, profile and health screening schema | Next |
| 3 | Exercise import, library, exercise detail with demos | Planned |
| 4 | Rule-based program engine, weekly plan, tests | Planned |
| 5 | Workout mode, logging, progress charts | Planned |
| 6 | AI coach chat | Planned |
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

4. Start the app and open http://localhost:3000.

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
| `npm run db:seed` | Seed data (from Phase 3) |
| `npm run db:studio` | Prisma Studio |

## Architecture

```
messages/            ar.json, en.json: every UI string
prisma/              schema, migrations, seed scripts
src/
  app/[locale]/      pages; the locale segment is the root layout
    (marketing)/     landing page
    (auth)/          login, signup
    (app)/           signed-in pages
  app/api/           route handlers (Auth.js, later the coach stream)
  components/        ui/ (shadcn), layout/, landing/, auth/, shared/
  i18n/              routing, navigation helpers, request config
  lib/               framework-free code: validation schemas, later the program engine
  server/            db client, auth, session helpers, server actions
  proxy.ts           locale routing and an optimistic signed-in check
```

Things worth knowing before changing code:

- **Locale** comes from the `[locale]` root segment through `next/root-params`, so pages can be prerendered. Root params are not readable in server actions or route handlers; those return error codes and the client translates them.
- **Auth checks** happen on the server in `requireUser()` and in every server action. `proxy.ts` only looks for a session cookie to skip a wasted render.
- **Session reads are request-time data.** With Cache Components they must sit inside a `<Suspense>` boundary, as the dashboard page shows.
- **RTL** uses logical utilities (`ms-`, `pe-`, `start-`, `end-`). Avoid `ml-`, `pr-`, `left-`, `right-`.
- **Color tokens** live in `src/app/globals.css`. `brand` is the lime fill and always carries dark text; `brand-text` is the accent used as text and changes per theme to keep contrast.
- **Fonts**: Sora for Latin and IBM Plex Sans Arabic for Arabic. The root layout puts only the primary family names in the font stack, because next/font's Arial fallback face would otherwise render the Arabic text.

## Exercise data

Exercises will be imported from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, public domain) into our own database, with images self-hosted. ExerciseDB was ruled out because its API terms forbid storing its data. Media is modeled so GIF, video or Lottie sources can replace the photo frames later.

## Screenshots

To be added as pages are completed.
