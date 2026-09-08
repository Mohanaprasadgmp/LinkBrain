# Architecture

This document explains how LinkBrain is laid out and, more importantly, why —
so that Phase 2 and beyond (database, authentication, AI, scraping, the Chrome
extension) can be added by extending these layers rather than rewriting them.

## Layers

```
app/                  Routes only: composition and metadata, no business logic.
components/           UI. Each component either renders or dispatches — never both
                       for a whole feature; complex features split a client "view"
                       component from the domain logic it calls.
lib/domain/           Types and the metadata (label, colour, order) for each enum.
lib/data/             The persistence seam: repository interfaces + the mock
                       implementation behind them.
lib/links/            Pure functions: search, filter, sort, stats. No React import.
lib/utils/            Small, dependency-free helpers (cn, dates, URLs, tags).
store/                Client state: a Context + useReducer store for Phase 1's
                       in-memory data.
hooks/                Cross-cutting client hooks (currently: URL-synced search).
config/               Static app metadata and navigation, as data, not markup.
```

The dependency direction is one-way: `app` depends on `components`, which
depend on `lib` and `store`; nothing in `lib` imports from `components` or
`app`. That's what keeps the business-logic layer swappable independent of the
UI sitting on top of it.

## The data seam

`lib/data/repository.ts` defines `LinkRepository` and `ProjectRepository` —
the contract a real backend must satisfy:

```ts
interface LinkRepository {
  list(): Promise<Link[]>;
  get(id: string): Promise<Link | null>;
  create(input: NewLinkInput): Promise<Link>;
  update(id: string, patch: LinkUpdate): Promise<Link | null>;
  delete(id: string): Promise<boolean>;
}
```

`lib/data/mock-repository.ts` implements it in memory. Phase 2 adds e.g.
`PrismaLinkRepository` implementing the same interface — nothing that already
depends on `LinkRepository` needs to change.

**Why the client store doesn't call the repository today:** Phase 1 has no
server to call — the "backend" is a plain array in memory, synchronous by
nature. `store/link-store.tsx` is a `useReducer` store whose actions
(`ADD_LINK`, `UPDATE_LINK`, `DELETE_LINK`, `TOGGLE_FAVORITE`, `SET_STATUS`,
`SET_PRIORITY`, `ARCHIVE_LINK`) mirror the repository's methods one-to-one on
purpose. When persistence arrives, each reducer action becomes "call the
repository (or a server action) then apply the result" instead of a redesign.

## Business logic stays framework-free

`lib/links/search.ts`, `filters.ts`, `sort.ts`, and `stats.ts` are pure
functions over arrays — no `useState`, no React import. A component calls
`sortLinks(filterLinks(links, filter), sort)`; a future route handler doing
real search calls the exact same functions server-side. This is also why they
have their own unit-testable shape rather than being inlined into components.

## Domain types drive their own presentation

`lib/domain/status.ts` and `priority.ts` pair each `LinkStatus`/`Priority`
value with its label, colour classes, and (for priority) sort weight, in one
record next to the type. Adding a status is a one-file change; every badge,
filter, and menu reads from the same table, so they can't drift out of sync
with each other.

## Route groups reserve room for auth

Every page lives under `app/(workspace)/`, which supplies the sidebar/topbar
chrome via its own `layout.tsx`. This is a zero-cost reservation: Phase 2 can
add `app/(auth)/sign-in` with a completely different (chrome-free) layout, and
`app/api/*` route handlers, without touching anything under `(workspace)`.

## Search lives in the URL

`hooks/use-search-query.ts` wraps `next/navigation`'s `useSearchParams` /
`useRouter` to read and write `?q=`. This makes a search shareable and correct
on back/forward navigation, and means a future server component doing real
search reads the same parameter a client component reads today.

Next.js 16 requires any component that calls `useSearchParams` (directly or
through a hook) to sit under a `<Suspense>` boundary, or the production build
fails with "Missing Suspense boundary". Every page that uses
`useSearchQuery` — Inbox, Favorites, All Links, Archive, and the top bar's
global search — wraps its client view in `<Suspense>` at the page level.

## Why so few dependencies

Beyond the framework, three packages are added: `lucide-react` (icons) and
`clsx` + `tailwind-merge` (the `cn()` class-merging helper). No headless UI
library, state-management library, theme library, date library, or form
library. The dropdown menu and dialog in `components/ui` are hand-rolled with
correct keyboard behaviour (roving focus, `Escape`, focus trap, focus return);
the theme provider is ~100 lines; relative dates use the built-in
`Intl.RelativeTimeFormat`. Each of these is small enough that owning it
outright costs less than the dependency would, and there's one fewer thing to
migrate when a later phase's requirements (e.g. a real command palette) change
the calculus.
