# LinkBrain

**A smart bookmark manager: save a link, and let LinkBrain help you organize
and understand it.**

Save a link → LinkBrain fetches its title, description and preview image
automatically → optionally file it into a project, add a note, set a status
and priority → AI generates a short summary, category, topics and key
points → find it again later, from the web app or the Chrome extension.

LinkBrain is not a knowledge-base or AI-chat platform — it's a bookmark
manager with automatic enrichment on top. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design history and
reasoning behind every layer described below.

## Features

- **Save links** from the web app or the Chrome extension, with automatic
  duplicate detection scoped to your own account.
- **Automatic metadata extraction** — title, description, favicon and
  preview image, fetched server-side (SSRF-guarded, size- and time-limited)
  the moment you save.
- **AI insights** (optional — see "AI configuration" below) — a concise
  summary, primary category, topics and key points generated per link,
  shown on that link's own detail page. Regenerate on demand; a failed or
  disabled AI attempt never affects the underlying saved link.
- **Organize**: projects, personal notes, status (saved/reading/read/
  archived), priority, and favorites.
- **Find things again**: full-text search, filtering, sorting, and
  pagination across your library.
- **Email/password and Google sign-in** (via [Better Auth](https://www.better-auth.com/)),
  with every link/project/AI-insight row scoped to its owning user at the
  database query level — there is no code path that can return another
  user's data.
- **Chrome extension** (Manifest V3) — save the page you're on from the
  toolbar, authenticated via a same-browser handoff from the web app (no
  password ever entered into the extension). See
  [extension/README.md](extension/README.md).

## Architecture, in one line

Next.js (App Router, Server Actions) → a repository layer → Drizzle ORM →
Postgres (hosted on [Neon](https://neon.tech)), with Better Auth for
sessions and the OpenAI API for AI enrichment, deployed as one application
on Vercel. There is a single environment and a single database — no
dev/staging/prod split. Full reasoning for every one of these choices is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local setup

### 1. Database

1. Create a free project at [neon.tech](https://neon.tech). On its
   dashboard, open **Connection Details** and copy the **pooled** connection
   string (mentions PgBouncer) — not the direct one.
2. ```bash
   cp .env.example .env.local
   ```
   Paste it as `DATABASE_URL` in `.env.local` (gitignored — never commit it).
3. Apply the schema:
   ```bash
   npm run db:generate   # only needed again if you change src/lib/db/schema/*
   npm run db:migrate
   ```

### 2. Authentication

In `.env.local`, set:

- `BETTER_AUTH_SECRET` — any random 32+ byte value (`openssl rand -base64 32`).
- `BETTER_AUTH_URL` — `http://localhost:3000` for local dev.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional. From a Google Cloud
  Console OAuth 2.0 Client ID; leave both blank to disable "Continue with
  Google" (email/password sign-in always works either way).

### 3. AI configuration (optional)

- `OPENAI_API_KEY` — leave blank to disable AI entirely: links still save
  and work normally, just without the AI Insights panel ever populating.
- `OPENAI_MODEL` — defaults to `gpt-5.6-luna`, a cost-conscious model.
  Configurable without a code change.

AI processing runs once per link, automatically, after it's already saved
— never on the critical path, never required for a save to succeed. See
`docs/ARCHITECTURE.md`'s "AI enrichment" section for the full design,
including exactly what is and isn't sent to OpenAI.

### 4. Seed development data (optional)

```bash
npm run db:seed
```

Creates a deterministic dev user and ~18 links / ~5 projects under it. This
**wipes and reseeds** the `links`/`projects` tables — safe against a scratch
database, but refuses to run at all unless you explicitly confirm it:

```bash
I_UNDERSTAND_THIS_WIPES_DATA=yes npm run db:seed
```

Never run this against a database that holds real user data.

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Chrome extension

See [extension/README.md](extension/README.md) for the full setup —
building it, loading it unpacked in Chrome, connecting it to your local (or
hosted) LinkBrain account, and packaging it for Chrome Web Store submission.
Short version:

```bash
npm run build:extension
```

Then `chrome://extensions` → enable Developer mode → **Load unpacked** →
select the `extension/` directory.

## Testing

```bash
npm test          # Vitest — repository, Server Action, and AI tests (mocked OpenAI)
npm run typecheck
npm run lint
npm run build
```

The suite exercises the real repository layer against Postgres (there's no
in-memory substitute that faithfully tests joins/transactions), and needs
its own `.env.test.local` — Vitest sets `NODE_ENV=test`, and `@next/env`
(used by the seed script, Drizzle config, and Vitest setup alike) skips
`.env.local` under `NODE_ENV=test` in favor of `.env.test.local`:

```bash
cp .env.local .env.test.local
```

Every row a test creates is scoped under a `test.linkbrain.internal` /
`Test Project ` / `test-user-` marker and removed automatically in
`afterAll`, so pointing `.env.test.local` at the same database `.env.local`
uses is safe. For stronger isolation, point it at a
[Neon branch](https://neon.tech/docs/introduction/branching) dedicated to
testing instead.

**No test ever calls the real OpenAI API or requires `OPENAI_API_KEY`** —
every AI-related test mocks the OpenAI client directly.

## Deployment

LinkBrain deploys as a standard Next.js app on [Vercel](https://vercel.com),
using the same single Neon database described above — no separate
production database. `docs/ARCHITECTURE.md`'s "Hosting and production
configuration" section has the full runbook: required environment
variables (note: `DATABASE_URL`/`BETTER_AUTH_*`/`GOOGLE_CLIENT_*` are needed
at **build** time, not just runtime, since Better Auth is constructed
eagerly at module load), the Google OAuth redirect URI to register, and how
the Chrome extension gets pointed at the deployed URL.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first `@theme`)
- [Drizzle ORM](https://orm.drizzle.team/) + [postgres.js](https://github.com/porsager/postgres) over [Neon](https://neon.tech) Postgres
- [Better Auth](https://www.better-auth.com/) for email/password + Google sign-in
- [OpenAI](https://platform.openai.com/) (Responses API) for AI enrichment
- [Vitest](https://vitest.dev/) for the test suite
- A Manifest V3 Chrome extension (plain TypeScript, no framework, no bundler)

No state-management library (Server Components + Server Actions +
`useOptimistic`/`useTransition` cover it), no ORM-agnostic abstraction
beyond the repository interfaces in `lib/data`, no validation library
(`lib/extension/validate-link-request.ts` and `lib/ai/schema.ts` hand-validate
untrusted input directly) — see `docs/ARCHITECTURE.md`'s "Why so few
dependencies" for the reasoning behind each.

## What LinkBrain intentionally does not do

By design, not by omission: no AI chat, no semantic/vector search, no
"ask your links a question," no analytics dashboards, no email digests or
notifications, no automatic tagging of your library. These are deliberately
out of scope so the core experience — save, organize, find, understand —
stays simple. Ideas for some of these are recorded (not implemented) in
`docs/ARCHITECTURE.md`'s "Ideas for later" section, for whenever they're
actually wanted.
