# LinkBrain — Chrome extension

A thin Manifest V3 client: save the current page to your LinkBrain library
without leaving the tab you're on. All business logic (validation, duplicate
detection, metadata extraction, project ownership) lives server-side in the
main app — see `../docs/ARCHITECTURE.md`'s "Chrome extension (Phase 6)"
section for the full design this README assumes.

## Build

No bundler — a handful of small TypeScript files compiled straight to ES
modules by the project's own `typescript`, referenced directly by
`popup.html`/`manifest.json`.

```bash
# from the repo root
npm run build:extension
```

This runs `tsc -p extension/tsconfig.json`, emitting `extension/dist/*.js`
(gitignored — rebuild after pulling).

## Load it in Chrome

1. `npm run build:extension`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. **Load unpacked** → select this `extension/` directory

The toolbar icon opens the popup. With the main app running at
`http://localhost:3000` (`npm run dev` from the repo root), click **Open
LinkBrain** from the popup's signed-out state, sign in normally, and the
`/extension` page it lands on hands the extension a session automatically —
no password is ever typed into the extension itself.

## Directory layout

```
manifest.json     MV3 manifest — pinned "key" (stable, non-secret extension id),
                   minimal permissions, externally_connectable for the handoff
popup.html/.css   the popup's markup/styles (plain DOM, no framework)
icons/            toolbar icon, generated from the web app's own accent-square "L" mark
src/
  config.ts        APP_URL — edit before packaging for a deployed instance
  types.ts         shapes shared between popup.ts and background.ts
  auth-storage.ts  the one place chrome.storage.local is read/written
  api-client.ts    fetch wrapper: attaches the bearer token, handles 401
  background.ts    receives the auth handoff from the web app
  popup.ts         all popup UI logic
dist/            compiled output (gitignored)
```

## Permissions, and why each one is here

- `storage` — persist the bearer token and `{id, name, email}` locally. No
  install-time warning.
- `activeTab` — read the active tab's url/title only when the user opens the
  popup. No install-time warning, and strictly narrower than `tabs`.

Nothing else. No `<all_urls>`, no `tabs`, no `cookies`, no `history`, no
`bookmarks`, no `host_permissions`.

## What's stored, and what never is

`chrome.storage.local` holds exactly the bearer token and the display fields
above. It never holds a password, a database credential, a Better Auth
secret, or a Google client secret — none of those are ever sent to the
extension in the first place. Anything shipped in this directory should be
treated as public: don't add real secrets here even temporarily.

## Before packaging for a deployed (non-localhost) instance

1. Update `APP_URL` in `src/config.ts`.
2. Add the deployed origin to `manifest.json`'s
   `externally_connectable.matches`.
3. Add that same origin to the `TRUSTED_ORIGINS` list in
   `src/background.ts` (defense-in-depth check alongside #2).

Publishing to the Chrome Web Store is out of scope for this phase — see
`../docs/ARCHITECTURE.md`'s "Known limitations."
