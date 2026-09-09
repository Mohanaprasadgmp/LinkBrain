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
manifest.json     MV3 manifest — pinned "key" (stable, non-secret dev extension id),
                   minimal permissions, externally_connectable for the handoff
popup.html/.css   the popup's markup/styles (plain DOM, no framework)
icons/            toolbar icon, generated from the web app's own accent-square "L" mark
src/
  config.ts        APP_URL — edit before packaging for a deployed instance
  types.ts         shapes shared between popup.ts and background.ts
  auth-storage.ts  the one place chrome.storage.local is read/written
  api-client.ts    fetch wrapper: attaches the bearer token, handles 401
  background.ts    receives the auth handoff from the web app; TRUSTED_ORIGINS
                    is the web-origin allow-list for that handoff
  popup.ts         all popup UI logic
scripts/
  package.mjs      builds a Chrome-Web-Store-ready .zip (npm run package:extension)
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

## Hosted configuration (pointing the extension at a deployed LinkBrain)

Once the web app is deployed (see `../docs/ARCHITECTURE.md`'s "Hosting and
production configuration"), before building a package that talks to it
instead of `localhost`:

1. Update `APP_URL` in `src/config.ts` to the real `https://...` URL.
2. Add that same origin to `manifest.json`'s
   `externally_connectable.matches` (e.g. `"https://your-app.vercel.app/*"`).
3. Add that same origin to the `TRUSTED_ORIGINS` list in
   `src/background.ts` (defense-in-depth check alongside #2 — Chrome's own
   enforcement is #2, this just re-checks it).
4. Rebuild: `npm run build:extension` (or `npm run package:extension` — see
   below).

These are three small, deliberately manual edits rather than a build-time
env-injection mechanism: there's no bundler here on purpose (see "Build"
above), and a build-time `.env` substitution would need one just for a
single URL used in two files.

## Chrome Web Store publishing

**The production extension id is not known yet** — Chrome Web Store
**rejects** a manifest containing a `"key"` field on an extension's *first*
upload (confirmed against Chrome's own developer docs), assigning its own id
at that point instead of honoring the pinned dev key. Only after that first
publish can the store's public key be copied back into `manifest.json` for
subsequent uploads, to keep the id stable going forward.

Steps:

1. Do the "Hosted configuration" edits above first, pointing at the real
   deployed URL.
2. `npm run package:extension` (from the repo root) — builds, then writes
   `extension/linkbrain-extension.zip` with `manifest.json`'s `"key"` field
   automatically stripped (`scripts/package.mjs` does this; the source
   `manifest.json` used for local `Load unpacked` is untouched). Sanity
   check before uploading: `unzip -l extension/linkbrain-extension.zip` and
   confirm `manifest.json` inside has no `"key"`.
3. Create a Chrome Web Store developer account (one-time $5 registration
   fee) and upload `linkbrain-extension.zip` as a new item.
4. Fill in the store listing (description, screenshots, privacy
   disclosures — this app's `/privacy` page describes what data the
   extension reads and stores, useful as a starting point for the store's
   own privacy questionnaire).
5. Once published, open the item's **Package** tab in the developer
   dashboard and copy its **public key**. Add that value to
   `src/config/extension.ts`'s `EXTENSION_IDS` array (as the real id — the
   dashboard shows the id directly too) and, optionally, back into a copy of
   `manifest.json` if you want subsequent store uploads to keep using the
   same key.
6. Update `lib/extension/cors.ts`'s allow-list happens automatically once
   `EXTENSION_IDS` is updated (it's derived from that array) — no other code
   change needed.

This project does not publish automatically — every step above is a manual
action in the Chrome Web Store dashboard.
