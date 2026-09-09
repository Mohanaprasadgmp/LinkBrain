# Architecture

This document explains how LinkBrain is laid out and, more importantly, why —
so that Phase 6 and beyond (AI, embeddings/semantic search, the Chrome
extension) can be added by extending these layers rather than rewriting them.

## Layers

```
app/                  Routes only: composition, metadata, and reading searchParams —
                       no query-building or business logic. (auth)/ and (workspace)/
                       are separate route groups with their own layouts — see
                       "Authentication and authorization" below.
components/           UI. Pages render an async "view" component (a Server Component
                       that fetches its own data) which renders client leaf
                       components for anything interactive.
lib/domain/           Types and the metadata (label, colour, order) for each enum —
                       the one thing every other layer, including the DB schema, reuses.
lib/db/               Server-only: the Drizzle client singleton and schema
                       (including Better Auth's own user/session/account/verification
                       tables, in `schema/auth.ts`).
lib/data/             The persistence seam: repository interfaces + their real
                       Drizzle implementations, and the factory that constructs them.
                       Every repository is user-scoped — see "Repository security" below.
lib/actions/          "use server" Server Actions — thin: resolve the authenticated
                       user, validate, call a repository method, revalidate, return
                       a result.
lib/auth.ts,          The Better Auth server instance and its Data Access Layer
lib/auth/,             (session resolution) — see "Authentication and authorization".
lib/auth-client.ts
lib/metadata/         Server-only URL metadata extraction: SSRF-safe fetch, HTML
                       parsing, precedence rules. No React/Next import — a pure
                       "given a URL, return metadata or a typed failure" module.
lib/links/            Pure functions: search, filter, sort. No React import. Now
                       used mainly by `MockLinkRepository` (see below) — the
                       production, Postgres-backed path composes the same logic
                       directly into SQL instead.
lib/utils/            Small, dependency-free helpers (cn, dates, URLs).
hooks/                Cross-cutting client hooks: the full link-list URL state
                       (`use-link-list-query`), plus the original `?q=`-only hook.
config/               Static app metadata and navigation, as data, not markup.
proxy.ts               Route protection — see "Authentication and authorization".
```

The dependency direction is one-way: `app` depends on `components`, which
depend on `lib`; `lib/actions` depends on `lib/data`, which depends on
`lib/db` and `lib/domain`. Nothing in `lib/domain` or `lib/links` imports from
`components`, `app`, or `lib/db` — that's what keeps the business-logic layer
independent of both the UI and the database sitting on either side of it.

## The data seam

`lib/data/repository.ts` defines two interfaces, and as of Phase 5 each one
has exactly one method:

```ts
interface LinkRepository {
  forUser(userId: string): UserScopedLinkRepository;
}
interface ProjectRepository {
  forUser(userId: string): UserScopedProjectRepository;
}
```

`UserScopedLinkRepository` (and the Project equivalent) carry all the actual
CRUD — `list`, `count`, `get`, `findByUrl`, `create`, `update`, `delete`,
`bulkApply` — but none of those methods take a `userId` parameter, because
they're already bound to one. See "Repository security" below for why this
shape exists, not just what it is.

`DrizzleLinkRepository`/`DrizzleProjectRepository` implement these against
Postgres; `lib/data/index.ts` is the one place a future backend swap would
touch (`getLinkRepository()`/`getProjectRepository()` factories, plus the
standalone `getLibraryStats(userId)`, `getSidebarCounts(userId)`,
`getProjectLinkStats(userId)` aggregate queries — plain `userId` parameters
rather than `forUser()`, since they're cross-entity aggregates, not one
entity's CRUD). `lib/data/mock-repository.ts` still exists and still
satisfies both interfaces (including `forUser()`, filtering its in-memory
arrays by a `userId` field) — nothing imports it anymore, but it's kept as a
reference implementation (its `list()`/`count()` compose the same pure
`filterLinks`/`sortLinks` helpers from `lib/links` that the Postgres path
re-expresses as SQL).

**Every raw database row is mapped to a domain type before it leaves
`lib/data`.** Each repository has an explicit row-mapping function; nothing
outside this directory ever sees a Drizzle row, a snake_case column name, or a
nested join shape. This is what keeps the database schema free to evolve
(rename a column, change a type, add an index) without that change rippling
into components.

## Server Actions are the mutation boundary

`lib/actions/links.ts` and `projects.ts` export `"use server"`
functions (`createLink`, `updateLink`, `deleteLink`, `toggleFavorite`,
`updateLinkStatus`, `updateLinkPriority`, `archiveLink`, `bulkUpdateLinks`,
`createProject`, `updateProject`, `deleteProject`). Every one follows the
same shape: **call
`requireUserIdForAction()` first and return `err(...)` if there's no session**
(see "Authentication and authorization"), validate what's cheap to validate
before touching the database, call exactly one repository method through
`.forUser(userId)`, catch a thrown error into a shared
`ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }`
(`lib/actions/result.ts`), call `revalidatePath` for every route that shows
the affected data (including a link's own `/links/[id]` detail page), and
return the result. All the actual query-building logic lives in the
repository, not here.

`bulkUpdateLinks(ids, action)` is the one action that takes a set of ids
rather than a single one: `action` is a `BulkLinkAction` discriminated union
(`lib/domain/types.ts`) — `{type:"status"|"priority"|"project"|"favorite"|
"archive"|"delete", ...}` — so a bulk toolbar click is still exactly one
Server Action call, which dispatches to exactly one `LinkRepository.bulkApply`
branch, which is exactly one SQL statement.

## URL metadata extraction (`lib/metadata/`)

Saving a link with just a URL triggers server-side enrichment, split by
concern so each piece stays independently testable and reusable by a future
AI/content-extraction phase:

- `ssrf-guard.ts` — pure: protocol allowlist (`http`/`https` only), and
  loopback/private/link-local IPv4 and IPv6 range checks.
- `fetch-page.ts` — the actual fetch: resolves and validates DNS *before*
  connecting and *before following each redirect hop* (redirects are handled
  manually so a public URL can't be used to reach a private address one hop
  later), a timeout, an incremental byte-counted size cap, and an HTML-only
  content-type check.
- `parse-html.ts` — `cheerio`, static parsing only; scripts on the fetched
  page are never executed.
- `precedence.ts` — pure functions applying the documented precedence rules
  (title: `og:title` → `<title>` → URL-derived fallback; description:
  `og:description` → meta description; image: `og:image` → `twitter:image`;
  favicon: declared `<link rel="icon">` → `apple-touch-icon` → a `/favicon.ico`
  guess).
- `extract-metadata.ts` — orchestrates the above into one
  `extractMetadata(url): Promise<MetadataResult>`, a discriminated
  success/failure result that never throws.

`createLink` (`lib/actions/links.ts`) uses this in two stages: the link is
inserted immediately with whatever the user typed, then `extractMetadata`
runs and a second `repo.update()` fills in only the fields the user left
blank. A slow or unreachable target site can only affect enrichment, never
whether the link gets saved — there is no code path where a broken website
prevents a save. **Known limitation, documented rather than silently
shipped:** the SSRF guard validates the DNS answer before connecting but
doesn't pin the TCP connection to that exact resolved address, so a
theoretical DNS-rebinding attack isn't fully closed; disproportionate
hardening for a personal single-user app's link-preview feature.

## Filtering, sorting and pagination live in the URL, and drive real queries

Every link-list page (`app/(workspace)/{links,inbox,favorites,archive}`, plus
the Project detail page) shares one URL query shape, defined once in
`lib/links/query-state.ts`:

```ts
interface LinkListQueryState {
  query: string;
  status: LinkStatus[];
  priority: Priority[];
  projectId: string | null;
  favorite: boolean;
  sort: LinkSort;
  page: number;
}
```

`parseLinkListSearchParams` reads this from either a `URLSearchParams`
(client) or the plain object Next's Server Component `searchParams` prop
provides (server) — the same parser runs on both sides. Each page's Server
Component parses it, merges its own structural constraint (Inbox's unread
statuses, Favorites' `isFavorite`, Archive's `status: ["archived"]`, or the
Project detail page's own scope) with the user's filter via
`stateToFilter()`, and calls `LinkRepository.list(filter, {sort, limit,
offset})` + `count(filter)` directly — there is no longer a "fetch broadly,
filter further in the browser" step anywhere in this path. `LinkCollectionView`
(client) owns no list-narrowing logic of its own: it renders controls bound to
`useLinkListQuery()` (`hooks/use-link-list-query.ts`, the generalised form of
the original `?q=`-only `use-search-query.ts`, which still exists for the
topbar's global-search launcher) and exactly the page of links/total it was
handed as props.

**Pagination is page/offset-based** (`LINKS_PAGE_SIZE = 30`, Previous/Next),
not cursor-based, despite that being the more scalable default for an
unbounded feed: five sort orders exist here, two of which (`title`,
`priority`) aren't monotonic on any single indexed column, so a cursor would
need a different composite-key shape per sort order to actually pay for
itself. `count()` reuses the exact same `buildWhere()` as `list()`, the same
pattern `getSidebarCounts()`/`getProjectLinkStats()` already used for their
own aggregates.

**"Archived" is folded into the existing Status filter, not a second
dimension.** `status` already includes `"archived"` as one of its four values
with full multi-select UI; when the user hasn't picked an explicit status, the
All Links/Favorites views default to excluding it (fixing a bug where "All
Links" had no status constraint at all and archived links leaked in) —
picking "Archived" in that same filter surfaces it, like any other status.

## Bulk selection

`LinkList`/`LinkCard` take an optional selection prop (a checkbox), left
`undefined` for callers that don't need it (the dashboard's "Recently saved"
list). `LinkCollectionView` owns the `Set<string>` of selected ids, reset
whenever the URL's filter/sort/page changes (comparing serialized query-state
strings, not the `links` array's object identity — a same-page mutation
re-fetches `links` with a new array reference but shouldn't drop the
selection on its own; `BulkActionToolbar` clears it explicitly once an action
actually completes). The toolbar itself is the one place that calls
`bulkUpdateLinks` — see the Server Actions section above.

## Projects: full CRUD, not just a read-only list

`createProject`/`updateProject`/`deleteProject` existed from Phase 2 but had
no UI until Phase 4 — the Projects page had no way to create one.
`ProjectDialog` (one component, an optional `project` prop selects create vs.
edit mode) now backs a "New project" action on the Projects page and an
Edit/Delete menu on each `ProjectCard`, which also now links to
`app/(workspace)/projects/[id]` (reusing `LinkCollectionView` scoped to
`projectId`, the same structural-filter pattern Archive/Favorites use for
their own scope). Deleting a project relies on the existing
`projectId` FK's `onDelete: "set null"` — links are kept, just unfiled. Name
length is capped (100 chars) as the one piece of validation beyond "not
blank." Nothing in the app assumes a fixed project count: the sidebar only
ever links to the static `/projects` route (it never enumerates individual
projects), and `pickProjectAccent()`'s 5-colour palette is a cosmetic hash by
id, unrelated to how many projects exist.

## Link detail page

`app/(workspace)/links/[id]` is a new, focused view of one link: title,
domain, favicon, preview image, description, personal note, project (linking
to its own detail page), an explicit status button-group and
priority button-group (a more visible control than the card row's compact
actions-menu — the row itself is untouched), favorite, created/updated dates,
and "Open Link" (which never rewrites the stored URL). Reached via a new
"View details" entry in `LinkActionsMenu`, additive to the card's existing
click targets. Editing reuses `EditLinkDialog` unchanged.

## What happened to the client reducer

Phase 1's `store/link-store.tsx` (`useReducer` seeded from fixtures) is gone.
Its replacement, page by page:

- **Reads**: each page (`app/(workspace)/*/page.tsx`) is `async`, calls a
  repository directly (or via its view component), and passes the result down
  as plain props.
- **Writes**: leaf client components call a Server Action directly inside
  `useTransition` (disabling the control while pending) instead of dispatching
  to a reducer. The favourite star on `LinkCard`/the link detail page is the
  one control using `useOptimistic` — the highest-frequency, lowest-risk
  interaction — for an instant flip that's automatically reconciled once the
  action's revalidation lands (or reverted, if it fails).
- **Sidebar badge counts** and the **project list** the Add/Edit Link dialogs
  need are fetched once by `app/(workspace)/layout.tsx` and handed down: badge
  counts as a plain prop; the project list via a small read-only
  `ProjectsProvider` Context (`components/layout/projects-context.tsx`) — not
  a reducer, it holds no mutation logic. The new filter/bulk-toolbar
  components read this same context directly rather than threading `projects`
  through more props.

Every dynamic, database-backed Server Component calls `await connection()`
(from `next/server`) as its first line — the Next.js 16-documented way to opt
a component out of static generation for something that must run per-request,
and what lets `next build` succeed with no `DATABASE_URL` set at all.

## Domain types drive their own presentation, and now the database too

`lib/domain/status.ts` and `priority.ts` still pair each `LinkStatus`/
`Priority` value with its label, colour classes, and sort weight. Their
`STATUS_ORDER`/`PRIORITY_ORDER` arrays are what `lib/db/schema/links.ts` uses
to build the Postgres `link_status`/`link_priority` enum types, and what
`DrizzleLinkRepository`'s `priority` sort's SQL `CASE` expression is generated
from — one canonical weight list feeding both the UI and the query, rather
than the two needing to be kept in sync by hand.

## Clocks: the database's, not the app server's

Every `updatedAt`/`archivedAt` write uses `sql`now()`` rather than a
JavaScript `new Date()`. This was a real, if narrow, bug caught while adding
the "recently updated" sort and its tests: `create()`'s `createdAt` already
came from Postgres's `defaultNow()`, but `update()` stamped `updatedAt` from
the app server's own clock — if that clock disagrees with the database's by
even a fraction of a second (routine for a local dev machine talking to a
cloud database), a link updated a moment after another was created could
still sort as *older*. Fixed by stamping every "now" value from the same
clock everywhere a repository writes one.

## Authentication and authorization

Phase 4's "User ownership was deferred, deliberately" note predicted exactly
this shape of change: `userId` columns added to existing tables, one
`WHERE userId = ...` per repository rather than a rewrite. This section
documents what actually landed.

### Why Better Auth, not Auth.js/NextAuth

Checked both against this exact stack before choosing. The only
App-Router-native Auth.js config (the `NextAuth(config)` + `auth()` pattern)
ships on the `next-auth@5.0.0-beta.32` tag — still beta — and its Credentials
provider doesn't hash or verify passwords for you; that code would have to be
hand-written. `better-auth@1.7.3` is a stable 1.x release with **built-in**
secure password hashing, **built-in** Google OAuth (`socialProviders.google`),
and **built-in** database session management, declares `next: "^16.0.0"` and
`drizzle-orm: "^0.45.2"` peer support (this project's exact Drizzle version),
and its own Next.js 16+ guidance already speaks this version's vocabulary
(see "Route protection" below) rather than needing to be worked around.

### Schema: Better Auth's tables, plus three `userId` columns

`lib/db/schema/auth.ts` (`user`, `session`, `account`, `verification`) was
generated with `better-auth generate` against `lib/auth.ts` rather than
hand-typed, so it matches exactly what this installed version's Drizzle
adapter expects — treated as provider-owned shape, left as close to the
generated output as possible. `user.id` is a Better-Auth-generated `text` id,
not a Postgres `uuid`.

`links.userId`, `projects.userId` (`text`, `references(() => user.id,
{ onDelete: "cascade" })`) are the two ownership columns.

**Migration path for the already-populated dev database** (three ordinary
migrations, not one risky one): `0002` added `userId` **nullable** to both
tables (a live table can't gain a `NOT NULL` column with no default in one
step). Between `0002` and `0003`, `lib/db/seed.ts` was updated to create a
deterministic **development user** (see below) and wipe-and-reseed every
fixture row under it — this project's dev database already does a full
wipe-and-reseed on every `db:seed` run, so that one normal run was the
backfill. `0003` then tightened both `userId` columns to `NOT NULL` — safe
once nothing was left null. At no point did the app run with unscoped,
nullable ownership treated as "good enough." (`0004` later dropped the `tags`/
`link_tags` tables entirely, once tagging was removed as a feature.)

### Development user

`lib/db/seed.ts` creates (idempotently — it looks the user up by email first)
a fixed development account via `auth.api.signUpEmail()`, so its password is
hashed exactly the way the real sign-up flow hashes one — no parallel
hand-rolled insert. Every fixture-seeded link/project is created under that
user's id. The email is this project's already-existing
`mohanaprasadgmp@gmail.com` placeholder identity; the password is a
non-secret, clearly-labelled local-only value in `seed.ts` itself (it only
ever protects throwaway fixture data on a local/dev database — the same
reasoning that already makes committing this whole script safe).

### Repository security: `repository.forUser(userId)`

`LinkRepository`/`ProjectRepository` each have exactly one method,
`forUser(userId)` — see "The data seam" above. This is not just a
convention; it's a type-level guarantee. There is no method on
`getLinkRepository()` itself that returns or touches data — the only way to
reach one is through `.forUser(id)`, and that `id` must come from
`lib/auth/session.ts` (below), never from a client payload or URL param.

Inside `DrizzleLinkRepository.forUser(userId)`, every query ANDs in
`eq(linksTable.userId, userId)`; `create()` always sets `userId` from the
closure, never from the input object; `update`/`delete`/`bulkApply` scope
their `WHERE` by both the target id(s) **and** `userId`, so an id belonging
to another user matches zero rows. `get`/`update` return `null`,
`delete`/`bulkApply` report `0` affected — exactly like an id that doesn't
exist at all. That's deliberate: every call site already treated "not found"
and "not yours" identically before this phase (`notFound()` on detail pages,
`err("This link no longer exists.")` in actions), so cross-user access fails
**the same way missing data already failed** — nothing new to leak, and no
new error path to get wrong.

One cross-user path needed an explicit fix, not just a `WHERE` clause: a
link's `projectId` could be set to *any* project id, including another
user's, since nothing validated it belonged to the same user. Fixed with a
`resolveOwnedProjectId(userId, projectId)` helper — used by `create()`,
`update()`, and `bulkApply`'s `"project"` action — that silently resolves a
foreign project id to `null` (unfiled) rather than trusting it, the same
"not found and not yours look identical" principle applied to a *value*
inside a patch, not just an id being operated on directly. Caught by a test
that tried to assign a link to another user's project and asserted the
project only ever showed up in *that* user's own list — worth noting because
it's exactly the kind of gap a purely "does list() filter by userId"
mental model misses.

### Session resolution: one Data Access Layer, two call shapes

`lib/auth/session.ts` (`server-only`), following the Next.js docs' own
recommended DAL pattern:

- `getCurrentUser()`/`getCurrentUserId()` — `cache()`-wrapped, call
  `auth.api.getSession({headers: await headers()})` once per request no
  matter how many call sites need it in the same render.
- `requireUserId()`/`requireUser()` — for **pages/Server Components**:
  `redirect("/sign-in")` if there's no session. Every list/detail view and
  `app/(workspace)/layout.tsx` itself call one of these — a second,
  defense-in-depth layer independent of `proxy.ts`.
- `requireUserIdForAction()` — for **Server Actions**: returns
  `{ok:true,userId} | {ok:false,error}` instead of redirecting (a Server
  Action returning a normal `ActionResult`-shaped error is more predictable
  than an in-flight redirect from what's usually a fetch/RPC call).

### Route protection: `proxy.ts`, not `middleware.ts`

**This Next.js version deprecated and renamed the `middleware.ts` file
convention to `proxy.ts`** (exported function `proxy`, not `middleware` —
confirmed from this installed version's own bundled docs,
`node_modules/next/dist/docs/.../proxy.md`, per `AGENTS.md`'s instruction to
read them before writing code; a file still named `middleware.ts` here would
simply never run). Proxy also now defaults to the **Node.js runtime**, not Edge.

`src/proxy.ts` uses Better Auth's `getSessionCookie()` for a fast,
**optimistic** cookie-presence check — no database round trip, safe on every
request — redirecting a signed-out visitor to `/sign-in` (preserving the
attempted path as `?from=`) and an already-signed-in visitor away from
`/sign-in`/`/sign-up`. It is not the authoritative check; that's
`requireUserId()`/`requireUserIdForAction()` above, close to the data, per
both Better Auth's and the Next.js docs' own guidance for this layer.

### Auth UI and Google OAuth

New route group `app/(auth)/` (the exact zero-cost slot Phase 4's
architecture doc predicted) has its own chrome-free layout — no
sidebar/topbar. `sign-in`/`sign-up` render client components built from the
same primitives every other form in this app already uses (`Field`, `Input`,
`Button`, inline error text under the form), calling Better Auth's client SDK
(`lib/auth-client.ts`'s `createAuthClient()`) directly —
`authClient.signIn.email()`, `authClient.signUp.email()` (with a
password-confirmation check before the call fires), `authClient.signIn.social
({provider:"google"})`. Errors are never the library's raw string — mapped to
one of a small set of safe messages (`INVALID_EMAIL_OR_PASSWORD` → "Incorrect
email or password", `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` → "An account
with that email already exists," a generic message for anything else).
`app/api/auth/[...all]/route.ts` (`toNextJsHandler(auth)`) is the one route
every one of those calls goes through, including the Google OAuth
redirect/callback. `socialProviders.google` in `lib/auth.ts` reads
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from the environment and is simply
omitted from the config when either is unset — the button still renders, a
click just surfaces a clear "not configured" message instead of a broken
redirect.

### A consequence worth naming: `DATABASE_URL` is now required at build time

`lib/auth.ts` exports `export const auth = betterAuth({...})` — Better Auth's
own canonical pattern, constructed eagerly at module load, not lazily like
`getDb()`. This is a real, deliberate departure from the property Phase 2's
`lib/db/index.ts` was specifically designed to preserve ("`next build`
succeeds with no `DATABASE_URL` set at all"): because `app/api/auth/[...all]/route.ts`
imports `auth`, and Next's build process loads every route module to inspect
its exports, `DATABASE_URL` (and the other Better Auth env vars) are now
needed at build time too. This is normal for real, database-backed
authentication — true of virtually every Next.js + Postgres + auth-library
app — and was accepted rather than wrapping `auth` in a lazy accessor purely
to preserve the old property, which would have been the "unnecessary
authentication abstraction" the brief asked to avoid.

## Route groups: no longer just reserved

`app/(auth)/` and `app/(workspace)/` are now both real. `(workspace)/layout.tsx`
supplies the sidebar/topbar chrome *and* is the workspace's own auth gate
(`requireUser()`) on top of `proxy.ts`; `(auth)/layout.tsx` supplies nothing
but a centered card. `app/api/auth/[...all]/route.ts` is the first `app/api/*`
route handler in this codebase — still true that a future Chrome extension's
own routes can be added alongside it without touching anything under
`(workspace)`.

## Why so few dependencies

Beyond the framework: `lucide-react` (icons), `clsx` + `tailwind-merge` (the
`cn()` helper) from Phase 1; `drizzle-orm` + `postgres` (the driver) for the
database, `drizzle-kit` to generate/apply migrations, `cheerio` for
script-free HTML parsing (metadata extraction, Phase 3), `better-auth`
(Phase 5 — see "Authentication and authorization" for why it over Auth.js;
its Drizzle Postgres adapter plugs directly into the existing `getDb()`
client, no parallel database setup), `vitest` for the test suite, `@next/env`
to load `.env.local` in standalone scripts that run outside the Next.js
request lifecycle, and `server-only` to make it a build error for
`DATABASE_URL` to reach a client bundle. No validation library, no
query-building abstraction beyond Drizzle's own relational API, no session
library beyond Better Auth's own (no need for a separate Iron Session/Jose
layer), no second state-management library — Server Actions plus
`useOptimistic`/`useTransition` cover what a reducer used to.
