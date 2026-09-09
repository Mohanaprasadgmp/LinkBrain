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

## Chrome extension (Phase 6)

A Manifest V3 extension (`extension/`, compiled and versioned separately from
the Next.js app) lets a signed-in user save the page they're on without
switching to the LinkBrain tab. It is a **thin client**: no business logic,
no database access, and no second authentication system.

```
Chrome extension → authenticated HTTPS request → app/api/extension/*
                                                        ↓
                                          lib/auth/session.ts (bearer or cookie)
                                                        ↓
                                    lib/services/link-service.ts / repository.forUser(userId)
                                                        ↓
                                                 Neon Postgres
```

### Credential representation: Better Auth's `bearer` plugin

`lib/auth.ts` registers `bearer()` (vendored by the installed
`better-auth@1.7.3`, `better-auth/plugins`) alongside `nextCookies()`. It
requires no schema and no custom cryptography: on a request carrying
`Authorization: Bearer <token>`, its `before` hook re-signs that raw token
and rewrites the request's headers so the rest of Better Auth sees it exactly
as it would see the matching session cookie. The practical effect —
`auth.api.getSession({ headers })`, the exact call `lib/auth/session.ts`'s
`getCurrentUser()` already makes on every page/action, resolves the session
identically whether `headers` came from a browser cookie or the extension's
`Authorization` header. **No extension-specific session-resolution code
exists anywhere** — `app/api/extension/*` routes call the same
`getCurrentUser()` pages already use. There is no second token system to
expire or revoke out of step with the web session: it's the same session row.

Rejected alternatives, and why: the extension implementing its own
email/password or Google OAuth form (forbidden by design — see "Sign-in
flow" below); `chrome.cookies` reading the session cookie directly (needs the
broad `cookies` permission, and the cookie is `httpOnly` by Better Auth's own
default — reading it out from under that is exactly the kind of weakening
this phase avoids); the OAuth 2.0 Device Authorization Grant
(`better-auth`'s `device-authorization` plugin, also vendored) — a real fit
for a device that *can't* open a browser, which doesn't describe a Chrome
extension that can already call `chrome.tabs.create`; adopting it would add a
verification-code UI and polling for no security benefit here.

### Sign-in flow: same-browser-tab handoff, not a second login form

1. The popup's "Open LinkBrain" (unauthenticated state) opens
   `{APP_URL}/extension` in a normal tab — `chrome.tabs.create`, no special
   permission needed.
2. That route lives inside `app/(workspace)/`, so it's already gated by
   `proxy.ts` + `requireUser()` exactly like every other workspace page. An
   unauthenticated visit lands on `/sign-in?from=/extension` and returns here
   after a normal, unmodified sign-in (`sign-in-form.tsx`'s existing `?from=`
   handling — nothing added for this phase).
3. Once authenticated, `components/extension/connect-panel.tsx` calls the
   `getExtensionHandoffToken()` Server Action (`lib/actions/extension.ts`).
   Being a Server Action, it's same-origin and POST-only by construction —
   not reachable cross-origin, unlike a Route Handler would be. It reads
   `session.session.token` — Better Auth's own raw session-token field —
   directly off `auth.api.getSession()`'s result, rather than relying on the
   `bearer` plugin's `set-auth-token` response header (that header is only
   re-emitted when a session happens to be due for its periodic cookie
   refresh, not on every call — not reliable enough for a one-shot handoff).
4. `ConnectPanel` calls
   `chrome.runtime.sendMessage(EXTENSION_ID, { type: "linkbrain:connect", token, user })`.
   This works because `extension/manifest.json` declares
   `externally_connectable.matches` for the LinkBrain origin — Chrome injects
   a minimal `sendMessage` binding into matching pages for that one declared
   extension, with **no permission or install-time warning** (`externally_connectable`
   is not a `permissions` entry).
5. `extension/src/background.ts` receives it via `onMessageExternal`, checks
   `sender.origin` against a small trusted-origin list (defense-in-depth —
   Chrome already only invokes this listener for a matched page), stores
   `{ token, user }` in `chrome.storage.local`, and acks.

**Stable, checked-in, non-secret extension id:** `externally_connectable`
needs the web app to know the extension's id ahead of time, but an unpacked
extension's id otherwise drifts with its install path. Fixed by pinning one
RSA public key in `extension/manifest.json`'s `"key"` field (not sensitive —
it only pins the id; the private key was discarded immediately after
generation and is never needed for local loading) and computing the
resulting id with Chrome's own algorithm (SHA-256 of the DER public key,
first 16 bytes, nibble-mapped to `a`–`p`), hardcoded as
`src/config/extension.ts`'s `EXTENSION_ID`. Publishing to the Chrome Web
Store later mints a *different* id — out of scope for this phase (see "Known
limitations").

**Sign-out is local-only.** The extension's "Sign out" clears
`chrome.storage.local` and never calls `/api/auth/sign-out`: with no
multi-session plugin in place, the extension's token *is* the same session
row as the browser's own cookie session, so a real revocation would also
sign the user out of the web app. This also means Better Auth's own
`[...all]` route needed zero CORS/trusted-origin changes for this phase — its
security boundary is exactly as narrow as it was before Phase 6. A future
"revoke this device" capability would need the `multi-session` plugin.

### API boundary: one shared service, not a second `createLink`

`lib/actions/links.ts`'s `createLink` used to contain the full "save a
link" logic (duplicate check → create → best-effort metadata enrichment →
revalidation) inline. That logic is now `lib/services/link-service.ts`'s
`createLinkForUser(userId, input, options)` — the one authoritative
implementation, gaining a small previously-missing set of length caps
(`LINK_INPUT_LIMITS`) along the way. `createLink` is now a thin wrapper:
resolve `userId` via `requireUserIdForAction()`, delegate. The extension's
route does the same, resolving `userId` via `getCurrentUser()` instead.
Neither goes through the other.

Three routes, all under `app/api/extension/` (already outside `proxy.ts`'s
matcher, so a bearer-only request is never redirected as if it were a
signed-out browser visit):

- `POST /api/extension/links` — create a link. Validates the untrusted JSON
  body (`lib/extension/validate-link-request.ts`: type/enum/length checks
  against the same `STATUS_ORDER`/`PRIORITY_ORDER`/`isValidUrl` the rest of
  the app uses — a `userId` field in the body is never read, let alone
  trusted), rate-limits (`lib/extension/rate-limit.ts`), then calls
  `createLinkForUser`.
- `GET /api/extension/projects` — the current user's own projects, via the
  same `getProjectRepository().forUser(userId)` type-level guarantee every
  other project list in this app relies on.
- `GET /api/extension/session` — `{ user }` or 401; lets the popup check
  "am I still signed in" on open and detect expiry/revocation proactively.

### CORS and origin policy

Scoped to these three routes only (`lib/extension/cors.ts`) —
`Access-Control-Allow-Origin` is always one exact origin from
`config/extension.ts`'s `EXTENSION_ORIGINS` list, never `*` and never a
reflected arbitrary `Origin` header, with `OPTIONS` preflight handling for
the `Authorization`/`Content-Type` headers the extension sends. No other
route's CORS behaviour changed; Better Auth's own `[...all]` route in
particular is untouched (see "Sign-out is local-only" above for why that was
possible). `EXTENSION_ORIGINS` being a list rather than one value is Phase
6B's change — see "Hosting and production configuration" below for why.

### Rate limiting

`lib/extension/rate-limit.ts` is a minimal in-memory sliding-window limiter
(20 requests/minute per authenticated user id) guarding
`POST /api/extension/links`. Known limitation, not glossed over: it's
per-process memory — it resets on redeploy and isn't shared across
serverless instances/regions, so it bounds an obviously abusive burst from
one warm instance rather than providing a hard global guarantee. A
production-grade limiter needs a shared store (Upstash/Redis) — real
infrastructure, out of scope for this phase.

### Extension storage

`chrome.storage.local`, written only by `extension/src/auth-storage.ts`,
holds exactly two things: the bearer token and `{id, name, email}` for
display. No password, no database credential, no Better Auth secret, no
Google credential — those never leave the server (verified: `grep`-ing
`extension/` and `extension/dist/` for `DATABASE_URL`/`BETTER_AUTH_SECRET`/
`GOOGLE_CLIENT_SECRET` finds nothing). Chrome sandboxes storage per-extension;
nothing here encrypts it further.

### Extension permissions

`storage` (persist the token/user locally) and `activeTab` (read the active
tab's url/title only when the user opens the popup) — both grant with no
install-time warning. Nothing else: no `<all_urls>`, no `tabs`, no `cookies`,
no `history`, no `bookmarks`, no `host_permissions` (an extension page's own
`fetch()` to `APP_URL` doesn't need them — only a content script's
cross-origin fetch would).

### Development setup / loading the extension locally

```
npm run build:extension     # tsc -p extension/tsconfig.json → extension/dist/
```

Then in Chrome: `chrome://extensions` → enable Developer mode → "Load
unpacked" → select the `extension/` directory. The toolbar icon opens the
popup; "Open LinkBrain" on its signed-out state walks through the handoff
above against `http://localhost:3000` (the `APP_URL` `extension/src/config.ts`
ships with).

### Production configuration

`extension/src/config.ts`'s `APP_URL` and `extension/manifest.json`'s
`externally_connectable.matches` both need the deployed LinkBrain origin
added before packaging for anything but local development — there is no
build-time env injection (no bundler, by design; see "Why so few
dependencies"). `app/api/extension/*` reuses `BETTER_AUTH_URL` (already this
app's own base URL) to build absolute `detailUrl` links in its responses —
no new server env var needed. Full step-by-step in `extension/README.md`'s
"Hosted configuration" and "Chrome Web Store publishing" sections.

### Known limitations

- Extension sign-out is local-only (see above) — no remote "revoke this
  device" without the `multi-session` plugin.
- Rate limiting is in-memory/per-process (see above).
- No offline queueing: a save while offline simply fails with a network
  error, matching the brief's explicit non-goal of offline sync.
- Chrome Web Store publishing is prepared (packaging script, documented
  steps) but not performed in this phase — see "Hosting and production
  configuration" below for the extension-id lifecycle this implies.

## Hosting and production configuration (Phase 6B)

Phase 6B makes the existing app/database/extension architecture reachable
over the public internet — it does not change the architecture itself.
There is deliberately **one** Neon database and **one** environment; nothing
here introduces a dev/staging/prod split.

```
User
 │
 ├── Browser ──────────────► LinkBrain Web App ──► Vercel / Next.js
 │                                                       │
 └── Chrome Extension ──► app/api/extension/* ───────────┤
                                                          ▼
                                              Better Auth (bearer or cookie)
                                                          │
                                                          ▼
                                        lib/services/link-service.ts /
                                        repository.forUser(userId)
                                                          │
                                                          ▼
                                                Neon PostgreSQL (unchanged)
```

### What needed no code change, and why (checked against the installed Better Auth version's source)

- **Secure cookies**: `node_modules/better-auth/dist/cookies/index.mjs`
  derives the `Secure` cookie attribute from whether `baseURL`
  (`BETTER_AUTH_URL`) starts with `https://`. Set that env var to the real
  hosted URL and secure cookies follow automatically.
- **Trusted origins / CSRF**: `node_modules/better-auth/dist/context/helpers.mjs`'s
  `getTrustedOrigins` always trusts `baseURL`'s own origin, plus anything
  listed in the optional `BETTER_AUTH_TRUSTED_ORIGINS` env var (comma-
  separated — read directly from `process.env` by Better Auth's own `@better-auth/core/env`
  helper, no code in this app reads or wires it). Useful during a domain
  transition (a `*.vercel.app` URL and a later custom domain, both trusted
  at once); unset otherwise.
- **Serverless-compatible database access**: `lib/db/index.ts` uses the
  `postgres` package over the Node.js runtime (nothing in this app opts into
  `export const runtime = "edge"`), and `.env.example` already specifies
  Neon's **pooled** (PgBouncer) connection string — exactly what a
  serverless platform's many short-lived function instances need to avoid
  exhausting Postgres's own connection limit. Using the *unpooled* Neon
  connection string in production would eventually exhaust connections
  under real concurrent traffic — this is the one field most likely to be
  filled in wrong.

### Vercel deployment

Standard Next.js app — Vercel auto-detects the framework, build command
(`next build`), and install command (`npm install`); no `vercel.json`
needed. **Every** `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` value must be set in Vercel's
Project Settings → Environment Variables **before the first deploy** — as
"A consequence worth naming" above already documents, `lib/auth.ts`
constructs the Better Auth instance eagerly at module load, so `next build`
itself needs these, not just requests after deploy. A build that appears to
"succeed locally" proves nothing about a Vercel build missing one of these.

### Google OAuth callback URL

Once the hosted URL is known, register this exact redirect URI in the
Google Cloud Console OAuth client's "Authorized redirect URIs":

```
{BETTER_AUTH_URL}/api/auth/callback/google
```

(e.g. `https://linkbrain.vercel.app/api/auth/callback/google`). Nothing else
changes — `lib/auth.ts`'s `socialProviders.google` block already reads
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from the environment and is
omitted entirely when either is unset, exactly as it was for local dev.

### Database migrations for the hosted deployment

No schema changes ship in Phase 6B. If the hosted deployment's Neon database
hasn't already had migrations `0001`–`0004` applied (it has, if you've been
developing against it locally — this is the *same* database, not a new
one), run the existing `npm run db:migrate` (`drizzle-kit migrate`) once
before or after the first deploy. **Never run `npm run db:seed`** against
this database once it holds anything beyond throwaway fixtures — see
"Seed-script safety guard" below.

### Seed-script safety guard

`lib/db/seed.ts` wipes and reseeds `links`/`projects` — safe when a database
holds nothing but dev fixtures, not once it's the same database a hosted
app's real users write to. It now refuses to run unless
`I_UNDERSTAND_THIS_WIPES_DATA=yes` is set, printing that instruction instead
of proceeding silently. This is a deliberate extra step, not a workaround —
there is no automatic environment detection here (there's only one
environment), just a confirmation gate before a destructive command.

### Extension-id lifecycle: dev-pinned vs. Chrome-Web-Store-assigned

`config/extension.ts`'s `EXTENSION_ID`/`EXTENSION_ORIGIN` (Phase 6, singular)
became `EXTENSION_IDS`/`EXTENSION_ORIGINS` (Phase 6B, a short list) because
the two ids are genuinely different things with different lifecycles:

- **Dev id** (`dngfnacmgpaglgoeealhgkfljnmekpoe`): deterministic from the
  public key pinned in `extension/manifest.json`, known today, used for
  local `Load unpacked` testing.
- **Chrome Web Store id**: assigned by Google at first publish. Confirmed
  against Chrome's own developer documentation: the Web Store **rejects** a
  manifest containing a `"key"` field on that first upload, so the pinned
  dev key cannot simply carry over — the real id is unknowable until the
  user has actually published the extension once. `extension/scripts/package.mjs`
  (`npm run package:extension`) automates stripping `"key"` from the
  packaged manifest so this can't be gotten wrong by accident.

`lib/extension/cors.ts` and `components/extension/connect-panel.tsx` both
read the `EXTENSION_IDS`/`EXTENSION_ORIGINS` list rather than a single
value, so once the user has the real Web Store id (visible in the developer
dashboard after first publish), adding it to that one array is the entire
code change — CORS and the connect handoff (which now tries each id in the
list in turn, since normally only one of dev/store is actually installed in
a given browser) both pick it up automatically. `extension/src/background.ts`'s
`TRUSTED_ORIGINS` (the *web*-origin side of the same handshake) needs the
hosted app's origin added the same way, alongside `manifest.json`'s
`externally_connectable.matches` — see `extension/README.md`.

### Privacy and Terms pages

`app/(legal)/privacy` and `app/(legal)/terms` — same zero-cost route-group
pattern as `(auth)`/`(workspace)`, no sidebar/topbar chrome. `proxy.ts`
gained a `PUBLIC_PATHS` list (alongside the existing `AUTH_PATHS`) so these
are reachable whether or not the visitor is signed in, without being
redirected either way. Content is specific to what this app actually does
(metadata extraction, what the extension reads/stores, no analytics, no data
sales) rather than generic boilerplate, and says plainly that it isn't a
substitute for professional legal advice. Linked from the sign-in/sign-up
footer and a small "Legal" row in Settings.

### What this phase does not do

Actual deployment execution (connecting the repo in Vercel, setting its
dashboard env vars, buying/attaching a domain), creating real Google OAuth
credentials, and Chrome Web Store registration/publishing all require
accounts and credentials this environment doesn't have — every one of those
is a manual step for the project owner, documented above and in
`extension/README.md` rather than performed automatically.

## AI enrichment (Phase 7)

After a link is saved, LinkBrain optionally asks OpenAI to analyze it —
summary, category, topics, key points, content type — and stores the result
alongside the link. This is a second, independent enrichment stage after
Phase 3's metadata extraction, not a replacement for it, and it is never on
the critical path: a link is fully saved and usable the instant
`repo.create()` returns, whether or not AI ever runs, succeeds, or is even
configured.

```
createLinkForUser()                          (critical path — unchanged)
  → repo.create()
  → extractMetadata()      → also returns the fetched HTML (reused below)
  → insert ai_insights row, status "pending"    (fast, synchronous)
  → after(() => processLinkAi(...))             (scheduled, non-blocking)
  → return { ok, link, metadataApplied }        (client gets this immediately)

after() callback, later, same invocation:
  processLinkAi()
    → skip entirely if OPENAI_API_KEY unset
    → atomically claim the row ("pending"/"failed" → "processing")
    → extractPageText(html)   cheerio-based, truncated, own module
    → openai.responses.create()   structured output, bounded output tokens
    → validate the parsed result against the same schema, server-side
    → persist "completed" + fields, or "failed" + a safe reason
```

### OpenAI SDK and API choice

`openai@7.12.1` (the current stable release at implementation time), using
the **Responses API** (`client.responses.create`) — confirmed against the
installed package's own TypeScript types, not assumed from memory:
`text.format` accepts a raw `{type:"json_schema", name, schema, strict:true}`
object (`lib/ai/schema.ts`); message `role` supports `"developer"` (see
"Prompt injection protection" below); `max_output_tokens`,
`reasoning.effort`, and `response.usage.{input_tokens,output_tokens}` are
all real, current fields on the installed SDK version. No Zod/validation
library was added just for this — this app has none (see "Why so few
dependencies" below) and already hand-validates untrusted input elsewhere
(`lib/extension/validate-link-request.ts`); `lib/ai/schema.ts`'s
`validateAiResult` follows that same pattern.

### Model configuration

`OPENAI_MODEL`, defaulting to `gpt-5.6-luna` — OpenAI's cheapest, fastest
tier in the GPT-5.6 family (confirmed as a real, current model before
using it), explicitly positioned for cost-sensitive, high-volume workloads,
which is exactly this use case. Read once, in `lib/ai/openai-client.ts`'s
`getConfiguredModel()` — never hardcoded anywhere else, so changing models
later is a one-line env var change, not a code change.

### AI service architecture

`lib/ai/` is the entire provider-specific surface:

- `openai-client.ts` — the one place `OPENAI_API_KEY` is read and the one
  `OpenAI` client is constructed (`import "server-only"`, lazy + cached,
  mirroring `lib/db/index.ts`'s `getDb()` pattern exactly). `isAiConfigured()`
  gates every other entry point.
- `extract-page-text.ts` — cheerio-based: strips script/style/nav/footer/
  iframe, collapses whitespace, hard-truncates (6,000 characters) — bounds
  cost regardless of source page size, independent of the output-side
  `max_output_tokens` bound.
- `prompt.ts` — the fixed developer instructions and the untrusted-content
  delimiter format (see below).
- `schema.ts` — the JSON schema sent to OpenAI, and `validateAiResult`, the
  server-side re-validation of whatever comes back. `strict:true` already
  constrains *shape*; this app never trusts model output for *content*
  without its own check regardless.
- `ai-service.ts` — `processLinkAi()`, the only place `responses.create` is
  called. Both entry points (the automatic trigger in `link-service.ts` and
  `regenerateAiInsights` in `lib/actions/ai.ts`) call this one function —
  never a second implementation of the pipeline.

Nothing above the `lib/ai/` boundary knows this is OpenAI specifically — a
future provider swap touches this directory alone.

### Database: `link_ai_insights`, not columns on `links`

A dedicated table (`lib/db/schema/ai-insights.ts`), one row per link
(`unique(linkId)`, cascade-deleted with it): `processingStatus` (`pending |
processing | completed | failed`), `summary`, `category` (plain text, not
an enum — the taxonomy stays free to evolve), `topics`/`keyPoints`
(Postgres `text[]`), `contentType`, `model`, `promptVersion`, `errorReason`
(a coarse, safe category, mirroring `lib/metadata/types.ts`'s
`MetadataFailureReason` pattern — never a raw error message), timestamps.

**No `userId` column, deliberately.** Ownership is inherited, not
duplicated: every read/write reaches this table only after the caller has
already resolved the link through `getLinkRepository().forUser(userId).get(linkId)`
— the same "not found and not yours look identical" guarantee every other
table in this app relies on (see "Repository security" above). Confirmed by
`lib/actions/ai.test.ts`'s cross-user test: requesting AI for another user's
link never even reaches the AI table.

### Duplicate-processing prevention: two compare-and-swaps, not one

A single "claim processing" method isn't enough, because the automatic path
and a user-triggered regenerate need *different* rules about what they're
allowed to override:

- `tryStartProcessing` (automatic path): claims only from `pending`/`failed`.
  **Never reprocesses a `completed` link** — the brief's "avoid processing a
  link again if an equivalent successful result already exists."
- `tryStartRegeneration` (user-triggered): claims from `pending`/`failed`/
  `completed` — a deliberate click is the only way to override a completed
  result.

Both refuse to claim a row that's currently `processing`, which is what
actually prevents two concurrent OpenAI calls for the same link (a race
between the automatic attempt and a fast "Regenerate" click, or a
double-click) — proven by a concurrency test in `lib/ai/ai-service.test.ts`
that fires two simultaneous attempts and asserts the mock was called
exactly once. `regenerateAiInsights` additionally enforces a 15-second
cooldown (keyed off the row's own `updatedAt`) independent of the CAS, so
rapid repeated clicks after a completed/failed result don't each spend an
API call.

### Prompt injection protection

Webpage content is untrusted — it may contain text engineered to look like
instructions. Two layers, both in `lib/ai/prompt.ts`:

1. **Role separation.** Fixed instructions are sent as a `developer`-role
   message; the untrusted title/description/domain/page-text go in a
   separate `user`-role message. OpenAI's Responses API documents
   `developer`/`system` messages as taking precedence over `user` content.
2. **Explicit framing + delimiters.** The developer message tells the model
   in plain language that the user message is inert data to analyze, never
   a command, and the untrusted content itself is wrapped in an explicit
   `%%%LINKBRAIN_UNTRUSTED_WEBPAGE_CONTENT%%%` delimiter the model is told
   to treat as a hard boundary.

Neither layer is a cryptographic guarantee — no prompt-injection defense is,
for any provider — so this is paired with output validation regardless of
what the model was tricked into producing: there are no tools/function
calls wired into this request at all, so a successful injection can at
worst corrupt this one link's own AI fields, never escalate to another
user's data or an action outside this narrow structured-output contract.

### Data sent to OpenAI, and data that is never sent

Sent: the link's `url`, `title`, `description`, `domain`, and truncated page
body text (from the same fetch `extractMetadata` already performed — see
below). That's the entire `AiProcessingContext` type
(`lib/ai/ai-service.ts`) — there is no field for anything else.

**Never sent**: `personalNote` (no field for it, structurally impossible to
pass through), passwords, session tokens, database credentials, any other
user's data, or any data beyond what's needed for this one link.

### One fetch serves both metadata and AI

`extractMetadata`'s `ok:true` result now includes the raw `html` it already
fetched (`lib/metadata/types.ts`) — `lib/ai/extract-page-text.ts` reuses that
same SSRF-checked, size-limited fetch instead of requesting the URL a second
time. `regenerateAiInsights` is the one exception: it deliberately re-fetches
(the page may have changed, or the first fetch may be what failed), which is
acceptable because it's a rate-limited, user-initiated action, not automatic.

### Execution model on Vercel: `after()`, not a queue

`next/server`'s `after()` (stable since Next 15.1.0, confirmed from this
version's own bundled docs at `node_modules/next/dist/docs/.../after.md`)
schedules `processLinkAi` to run after the save response has already been
sent, within the same function invocation — Vercel wires its `waitUntil`
primitive into `after()` automatically, so this needed zero new
infrastructure. Vercel's Fluid Compute (default since April 2025) gives
serverless functions 300 seconds by default; `app/api/extension/links/route.ts`
additionally sets `export const maxDuration = 30` explicitly so the AI call
always has room regardless of platform default. The web app's `createLink`
Server Action relies on the platform default rather than a per-page
override, since Server Actions can only override `maxDuration` at the page
level and `createLink` is invoked from several pages via one shared dialog
— scattering that override across every page seemed like worse engineering
than relying on a default that's already generous.

### Failure handling — no automatic retry

Every failure path — OpenAI errors (classified via the SDK's own typed
error classes: `RateLimitError` → `rate-limited`, `APIConnectionTimeoutError`
→ `timeout`, `APIConnectionError` → `network-error`, anything else →
`unknown`), malformed JSON, or a response that fails `validateAiResult` —
ends in `markFailed`, never a thrown exception left for `after()` to swallow
silently. A `failed` row stays `failed` until a human clicks "Regenerate" —
there is no automatic retry loop. The OpenAI SDK's own small built-in retry
(bounded to 1, down from its default of 2 — `lib/ai/openai-client.ts`) stays
on for transient network/5xx errors *within* that one attempt, which is
bounded, not the "automatic retry" the brief warns against.

### Cost controls, concretely

- **Zero API calls in automated tests** — every test mocks
  `lib/ai/openai-client.ts` (or the SDK's own error classes for failure
  cases); `npm test` needs no `OPENAI_API_KEY` and makes no network call.
- **Zero calls without a configured key** — `isAiConfigured()` gates both
  entry points; no dangling `pending` rows when OpenAI isn't set up.
- **Exactly one automatic attempt per link**, and never a repeat of it (see
  "Duplicate-processing prevention" above).
- **Bounded input**: page text capped at 6,000 characters; title/description
  already capped by Phase 6's `LINK_INPUT_LIMITS`.
- **Bounded output**: `max_output_tokens: 1200`, `reasoning: {effort:"low"}`
  (Luna is a reasoning model; low effort keeps latency and invisible
  reasoning-token cost down for a task this simple), `text.verbosity:"low"`,
  plus schema `minItems`/`maxItems` on `topics`/`keyPoints` and a character
  ceiling on `summary`.
- **No personal note, ever** — structurally absent from the request type.

### UI

`components/links/ai-insights-panel.tsx` on the link detail page, the four
states from the brief's mockup (not analyzed / processing / completed /
failed). While `pending`/`processing`, it polls via `router.refresh()` a
bounded number of times (10 attempts, 3 seconds apart, then stops) so a page
left open shows the result without a manual reload — though a manual reload
always works too, since the AI attempt runs entirely server-side regardless
of whether anyone is watching. "Regenerate AI" calls
`lib/actions/ai.ts`'s `regenerateAiInsights` directly.

### Chrome extension

Unchanged architecture — the extension still only ever calls
`app/api/extension/links`, which calls the same `createLinkForUser` that
now triggers AI enrichment automatically. The response gained one field,
`aiEnabled` (whether `OPENAI_API_KEY` is configured), purely so the popup's
success copy can say "Saved — AI analysis in progress" instead of a plain
"Saved to LinkBrain" — the extension never calls OpenAI, never sees an API
key, and has no other AI-related code at all.

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

Phase 6 adds exactly one: `@types/chrome` (types only, no runtime code) so
the extension's own `tsc` build — no bundler — can typecheck against real
Chrome extension APIs.

Phase 7 adds exactly one: `openai`, the official Node SDK — no validation
library added alongside it (see "AI enrichment"'s note on why
`lib/ai/schema.ts` hand-validates instead of using Zod).

## Ideas for later (documented, not implemented)

Recorded during the Phase 7.5 polish pass as legitimate future directions —
deliberately **not** built now, per that phase's explicit scope boundary
(no new features, no Phase 8 functionality):

- **Real, working view preferences.** Settings used to show "Open links in
  a new tab," "Show favicons," and "Compact list view" toggles that looked
  interactive but had no effect anywhere (removed in Phase 7.5 — see that
  phase's report). Doing this for real means threading a preference through
  every link-rendering component (`LinkCard`, `LinkDetailBody`, list views)
  and persisting it (`localStorage` at minimum, a real user-settings table
  for something durable across devices) — a small feature, not a one-line
  fix, and out of scope for a polish phase.
- **A lightweight tag system**, now that Phase 7's AI already produces
  per-link topics. Tags were removed in Phase 5 for being unused; AI topics
  could plausibly seed a "promote this topic to a tag" flow later, without
  automatically creating persistent tags on the user's behalf (Phase 7's own
  brief was explicit that AI topics and user tags must stay separate).
- **Semantic/vector search, "Ask My Links," AI chat, related-links,
  knowledge packs, recommendations, analytics, digests, notifications** —
  the standard "AI knowledge platform" feature set every phase from 6B
  onward has explicitly deferred. LinkBrain's current positioning (a smart
  bookmark manager, not a knowledge platform) means these should only be
  built if that positioning deliberately changes, not as an assumed next
  step.
