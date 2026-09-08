# LinkBrain

**Your personal memory for the internet.**

LinkBrain is a personal AI-powered link library: save URLs, organize them into
projects and tags, keep notes, track what you've read, and eventually ask
questions about your own library. This repository is being built
incrementally, phase by phase.

## Phase 1 — Application Foundation & Frontend UI

This phase establishes the application shell and every major page, running
entirely on mock data. There is no backend yet: no database, no
authentication, no AI, no web scraping, no external API calls. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the codebase is laid out
so those pieces can be added later without reworking the UI.

### What's implemented

- Responsive dashboard shell: collapsible desktop sidebar, off-canvas mobile
  drawer, persistent top bar with global search and an Add Link action.
- Full navigation: Home, Inbox, Favorites, All Links, Projects, Tags, Archive,
  Settings — each a real page over mock data.
- Link cards with favicon placeholder, domain, title, description, tags,
  status, priority, favorite indicator, relative save date, and a full actions
  menu (open, favorite, change status, change priority, edit, archive,
  delete).
- Add Link and Edit Link dialogs, both backed by client-side state.
- Local search (title, domain, description, tags) synced to the URL, plus
  status/priority filtering and sorting.
- Projects and Tags pages, with counts derived live from the links that
  reference them.
- Settings with Profile, Appearance (light/dark/system, persisted), 
  Preferences, and disabled AI/Account placeholders for later phases.
- Light and dark themes, keyboard-accessible menus and dialogs, and no
  hydration flash on load.

### What's intentionally not implemented yet

Database persistence, authentication, API routes, AI features (categorisation,
summaries, related links, Q&A, knowledge packs), web scraping / metadata
extraction, vector search, the Chrome extension, background jobs,
notifications, and payments. All data lives in memory and resets on reload.

## Getting started

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build       # production build
npm run start       # run the production build
npm run lint        # ESLint
npm run typecheck   # TypeScript, no emit
```

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first `@theme`, no config file)
- [lucide-react](https://lucide.dev/) for icons

No state-management, animation, date, or form library is included — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for why.
