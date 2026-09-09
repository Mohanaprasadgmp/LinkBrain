# LinkBrain

**Your personal memory for the internet.**

LinkBrain is a personal AI-powered link library: save URLs, organize them into
projects, keep notes, track what you've read, and eventually ask
questions about your own library. This repository is being built
incrementally, phase by phase.

## Phase 2 — PostgreSQL + Neon + Drizzle + Real Backend Persistence

Phase 1 built the full UI on an in-memory mock store. Phase 2 replaces that
with a real backend: **Postgres (hosted on [Neon](https://neon.tech)) →
[Drizzle ORM](https://orm.drizzle.team/) → a repository layer → Server
Actions / Server Components → the same UI**. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full layering and the
reasoning behind it.

### What's implemented

Everything from Phase 1, now backed by a real database instead of mock data:

- Links and projects persisted in Postgres.
- Add Link, Edit Link, favorite, status, priority, archive, and delete all
  write through Server Actions and survive a refresh.
- Dashboard stats, Inbox/Favorites/All Links/Archive, and Projects pages
  all read live from the database via Server Components.
- Server-side search (title, description, and domain) using Postgres
  full-text search — no fetching the whole table into the browser to filter.
- Saving/pending/error states on every mutation (`useTransition`, a
  `useOptimistic` favorite toggle, and inline error messages instead of
  silent failures).
- A repository-level test suite (Vitest) against a real Postgres connection,
  and a seed script that reproduces Phase 1's fixture content as real rows.

### What's intentionally not implemented yet

Authentication, API routes for external clients (e.g. a future Chrome
extension), AI features (categorisation, summaries, related links, Q&A,
knowledge packs), URL metadata extraction / web scraping, vector or semantic
search, background jobs, notifications, and payments.

## Setting up your database

1. **Create a Neon project.** Sign up at [neon.tech](https://neon.tech) (the
   free tier is enough) and create a project. On the project's dashboard,
   open **Connection Details** and copy the **pooled** connection string (the
   one that mentions PgBouncer) — not the direct one.
2. **Configure your environment.**
   ```bash
   cp .env.example .env.local
   ```
   Paste your connection string as `DATABASE_URL` in `.env.local`. This file
   is gitignored — never commit it.
3. **Apply the schema.**
   ```bash
   npm run db:generate   # only needed again if you change src/lib/db/schema/*
   npm run db:migrate
   ```
4. **Seed development data** (~18 links, ~5 projects, matching
   Phase 1's fixtures):
   ```bash
   npm run db:seed
   ```
   This clears and reseeds the links/projects tables every time it
   runs — point it at a scratch database, not anything you care about.
5. **Run the app.**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Running tests

The test suite exercises the real repository layer against Postgres (there's
no in-memory substitute that faithfully tests joins or transactions).

Tests need their own `.env.test.local` (not `.env.local`): Vitest sets
`NODE_ENV=test`, and Next's own env-loading convention deliberately skips
`.env.local` under `NODE_ENV=test` in favor of `.env.test.local` — this isn't
LinkBrain-specific, it's how `@next/env` (which the seed script, Drizzle
config, and Vitest setup all use to load env files outside the Next.js
request lifecycle) always behaves.

```bash
cp .env.local .env.test.local
```

Every row the tests create is scoped under a `test.linkbrain.internal` /
`Test Project ` marker and removed automatically in `afterAll`, so pointing
`.env.test.local` at the same database `.env.local` uses is safe.
For stronger isolation, point it at a
[Neon branch](https://neon.tech/docs/introduction/branching) dedicated to
testing instead, so a test run can never touch real data even if interrupted
mid-run.

```bash
npm test
```

## Other scripts

```bash
npm run build       # production build
npm run start       # run the production build
npm run lint        # ESLint
npm run typecheck   # TypeScript, no emit
npm run db:generate # generate a Drizzle migration from src/lib/db/schema
npm run db:migrate  # apply pending migrations to DATABASE_URL
npm run db:seed     # wipe and reseed dev data
npm test            # run the Vitest suite (needs DATABASE_URL)
```

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first `@theme`, no config file)
- [lucide-react](https://lucide.dev/) for icons
- [Drizzle ORM](https://orm.drizzle.team/) + [postgres.js](https://github.com/porsager/postgres) over a [Neon](https://neon.tech) Postgres database
- [Vitest](https://vitest.dev/) for the repository test suite

No state-management library (Server Components + Server Actions +
`useOptimistic`/`useTransition` cover it), no ORM-agnostic abstraction beyond
the repository interfaces already in `lib/data`, no validation library
(URL validation reuses the existing pure functions in `lib/utils`) — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for why.
