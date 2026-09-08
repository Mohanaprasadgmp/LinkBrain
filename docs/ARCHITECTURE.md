# Architecture

This document explains how LinkBrain is laid out and, more importantly, why —
so that Phase 3 and beyond (auth, AI, scraping, the Chrome extension) can be
added by extending these layers rather than rewriting them.

## Layers

```
app/                  Routes only: composition, metadata, and reading searchParams —
                       no query-building or business logic.
components/           UI. Pages render an async "view" component (a Server Component
                       that fetches its own data) which renders client leaf
                       components for anything interactive.
lib/domain/           Types and the metadata (label, colour, order) for each enum —
                       the one thing every other layer, including the DB schema, reuses.
lib/db/               Server-only: the Drizzle client singleton and schema.
lib/data/             The persistence seam: repository interfaces + their real
                       Drizzle implementations, and the factory that constructs them.
lib/actions/          "use server" Server Actions — thin: validate, call a
                       repository method, revalidate, return a result.
lib/links/            Pure functions: search, filter, sort, stats. No React import.
                       Still used client-side, now over server-scoped arrays.
lib/utils/            Small, dependency-free helpers (cn, dates, URLs, tags).
hooks/                Cross-cutting client hooks (URL-synced search).
config/               Static app metadata and navigation, as data, not markup.
```

The dependency direction is one-way: `app` depends on `components`, which
depend on `lib`; `lib/actions` depends on `lib/data`, which depends on
`lib/db` and `lib/domain`. Nothing in `lib/domain` or `lib/links` imports from
`components`, `app`, or `lib/db` — that's what keeps the business-logic layer
independent of both the UI and the database sitting on either side of it.

## The data seam is now live

`lib/data/repository.ts` defines `LinkRepository` and `ProjectRepository`:

```ts
interface LinkRepository {
  list(filter?: LinkFilter): Promise<Link[]>;
  get(id: string): Promise<Link | null>;
  create(input: NewLinkInput): Promise<Link>;
  update(id: string, patch: LinkUpdate): Promise<Link | null>;
  delete(id: string): Promise<boolean>;
}
```

`lib/data/drizzle-link-repository.ts` and `drizzle-project-repository.ts`
implement these against Postgres; `lib/data/index.ts` is the one place a
future backend swap would touch (`getLinkRepository()`/`getProjectRepository()`
factories). `lib/data/mock-repository.ts` still exists and still satisfies
both interfaces — nothing imports it anymore, but it's kept as a reference
implementation and as a second example of what the interface requires.

**Every raw database row is mapped to a domain type before it leaves
`lib/data`.** Each repository has an explicit `rowToLink`/`rowToProject`
function; nothing outside this directory ever sees a Drizzle row, a snake_case
column name, or a nested join shape. This is what keeps the database schema
free to evolve (rename a column, change a type, add an index) without that
change rippling into components — the coupling risk was never "do the enum
string values match," it was "does the DB's row shape leak into the UI."

## Server Actions are the mutation boundary

`lib/actions/links.ts` and `projects.ts` export `"use server"` functions
(`createLink`, `updateLink`, `deleteLink`, `toggleFavorite`,
`updateLinkStatus`, `updateLinkPriority`, `archiveLink`, `createProject`,
`updateProject`, `deleteProject`). Every one follows the same shape: validate
what's cheap to validate before touching the database, call exactly one
repository method, catch a thrown error into a shared
`ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }`
(`lib/actions/result.ts`), call `revalidatePath` for every route that shows
link or project data, and return the result. All the actual query-building
logic lives in the repository, not here — Server Actions stay thin on purpose,
so "what does creating a link do" has exactly one place to read the answer.

## What happened to the client reducer

Phase 1's `store/link-store.tsx` (`useReducer` seeded from fixtures) is gone.
Its replacement, page by page:

- **Reads**: each page (`app/(workspace)/*/page.tsx`) is now `async`, calls
  `getLinkRepository()`/`getProjectRepository()` directly (or via its view
  component), and passes the result down as plain props — the same
  `LinkCollectionView`, `LinkCard`, `ProjectCard`, etc. from Phase 1, just fed
  server-fetched data instead of client-store data.
- **Writes**: leaf client components call a Server Action directly inside
  `useTransition` (disabling the control while pending) instead of dispatching
  to a reducer. The favourite star on `LinkCard` is the one control using
  `useOptimistic` — the highest-frequency, lowest-risk interaction — for an
  instant flip that's automatically reconciled once the action's revalidation
  lands (or reverted, if it fails).
- **Sidebar badge counts** and the **project list** the Add/Edit Link dialogs
  need are fetched once by `app/(workspace)/layout.tsx` and handed down: badge
  counts as a plain prop through `AppShell` → `Sidebar`/`Topbar`/`MobileNav`;
  the project list via a small read-only `ProjectsProvider` Context
  (`components/layout/projects-context.tsx`) — not a reducer, it holds no
  mutation logic, just a value that would otherwise need threading through
  every page's own component tree down to whichever dialog is open.

Every dynamic, database-backed Server Component calls `await connection()`
(from `next/server`) as its first line. This is the Next.js 16-documented way
to opt a component out of static generation for a component that must run
per-request — the alternative, `export const dynamic = "force-dynamic"`, is
what the framework's own docs steer you away from for this case. It's also
what lets `next build` succeed with no `DATABASE_URL` set at all: nothing
touches the database during the build's static-generation pass.

## Business logic stays framework-free — and now split by where it runs

`lib/links/search.ts`, `filters.ts`, `sort.ts`, and `stats.ts` are unchanged,
still pure functions over arrays. What changed is *what* they're called on:
free-text search (title/description/domain/tags) is now a Postgres query
(`DrizzleLinkRepository.list({ query })`, using `to_tsvector`/`plainto_tsquery`
— ordinary full-text search, not the vector/embedding kind), and each page's
status scope (Inbox's `saved | reading`, Favorites' `isFavorite`, Archive's
`archived`) is a `WHERE` clause, not a client-side filter. The in-page
status/priority chip filters and all five sort modes stay exactly as they
were: client-side, via `filterLinks`/`sortLinks`, applied to the
already-server-scoped-and-searched array `LinkCollectionView` receives as a
prop. That's a deliberate line, not an oversight — see the "Search" section
below.

## Domain types drive their own presentation, and now the database too

`lib/domain/status.ts` and `priority.ts` still pair each `LinkStatus`/
`Priority` value with its label, colour classes, and sort weight. Their
`STATUS_ORDER`/`PRIORITY_ORDER` arrays are now also what
`lib/db/schema/links.ts` uses to build the Postgres `link_status`/
`link_priority` enum types — reusing the existing canonical value list rather
than retyping the same four/four strings a second time, while the
row-mapping functions in `lib/data` remain the only bridge between the two
representations.

## Tags: normalized, not comma-separated

`tags` and `link_tags` (`lib/db/schema/tags.ts`) give tags a proper
many-to-many relationship: `tags.slug` is unique, computed via the same
`slugifyTag()` util that Phase 1 used to deduplicate tags in memory, so "AWS"
and "aws" resolve to one row with whichever spelling was seen first as the
display name. `DrizzleLinkRepository.create`/`update` wrap tag writes in a
`db.transaction()` — a link and its tag assignments are never left half
-written if something fails partway through. The Tags page's counts come from
a `GROUP BY` query (`listTagsWithCounts`) rather than the old `deriveTags()`
pure function, which scanned an in-memory array that no longer exists once
links live in Postgres — `deriveTags()` was removed rather than kept around
unused.

## User ownership was deferred, deliberately

There is no `userId` column and no `users` table in Phase 2 — this is
explicitly a personal, single-user app for now, and authentication is a later
phase. The schema is shaped so adding ownership later is additive: every
table already has its own surrogate `id`, uniqueness is scoped to what's
actually global today (`tags.slug`) rather than assumed to need scoping to a
user, and every query the app makes goes through the repository layer, so
"add a `WHERE userId = ...`" touches one file per table rather than every call
site. Adding `userId` later means one migration per table plus one repository
constructor parameter — not a schema redesign.

## Route groups reserve room for auth

Every page still lives under `app/(workspace)/`, whose `layout.tsx` supplies
the sidebar/topbar chrome (and now also fetches the sidebar badge counts and
project list — see above). This remains a zero-cost reservation: a future
`app/(auth)/sign-in` with a completely different (chrome-free) layout, and
`app/api/*` route handlers for a Chrome extension to call, can be added
without touching anything under `(workspace)`.

## Search lives in the URL, now driving a real query

`hooks/use-search-query.ts` still wraps `useSearchParams`/`useRouter` to read
and write `?q=`. What's different from Phase 1: typing into the search box
now navigates (via `router.replace`) to a URL whose `searchParams.q` the
*page* reads and passes into a live Postgres query — not a client-side array
filter. The `<Suspense>` boundary every list page wraps its view in still
exists for the same Next.js 16 reason (a `useSearchParams` consumer needs one
during static generation), but it's doing real work now: streaming the actual
database query instead of only satisfying a build-time requirement.

**Why status/priority chip filters and sorting stayed client-side:** moving
the free-text query server-side was explicit in this phase's scope; moving
the in-page multi-select filters and all five sort modes server-side as well
would mean URL-syncing five more filter dimensions with no scaling benefit
yet, since there's no pagination — the full scoped-and-searched result set is
already in the browser either way until a future phase introduces one. This
is a deliberate scope line, not an oversight.

## Why so few dependencies

Beyond the framework: `lucide-react` (icons), `clsx` + `tailwind-merge` (the
`cn()` helper) from Phase 1; `drizzle-orm` + `postgres` (the driver) for the
database, `drizzle-kit` to generate/apply migrations, `vitest` for the
repository test suite, `@next/env` to load `.env.local` in standalone scripts
(`drizzle.config.ts`, the seed script, Vitest) that run outside the Next.js
request lifecycle, and `server-only` to make it a build error for
`DATABASE_URL` to reach a client bundle. No validation library — URL and tag
validation reuse the pure functions already in `lib/utils`. No query-building
abstraction beyond Drizzle's own relational API. No second state-management
library for the client side of things — Server Actions plus
`useOptimistic`/`useTransition` cover what a reducer used to.
