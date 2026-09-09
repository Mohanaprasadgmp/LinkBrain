/**
 * Chrome extension configuration shared by the web app.
 *
 * Every id here is deterministic, not secret. The dev id is derived from the
 * public key pinned in `extension/manifest.json`'s `"key"` field (Chrome's
 * own algorithm — SHA-256 of the DER-encoded public key, first 16 bytes,
 * nibble-mapped to `a`–`p`), so every developer who loads that same
 * `extension/` folder unpacked gets this exact id.
 *
 * This is a *list*, not a single constant, because publishing to the Chrome
 * Web Store mints a **different** id — Chrome rejects a manifest containing
 * a `"key"` field on an extension's first upload, assigning its own id at
 * that point (see `docs/ARCHITECTURE.md`'s "Hosting and production
 * configuration" section). That real id isn't knowable until the user has
 * actually published, so it can't be hardcoded here yet — add it to this
 * array (and to `extension/src/background.ts`'s `TRUSTED_ORIGINS`, for the
 * matching web-origin side of the same handshake) once the Chrome Web Store
 * dashboard shows it, and it's live everywhere that reads this list without
 * any other code change.
 *
 * Used by `components/extension/connect-panel.tsx` (which id to
 * `chrome.runtime.sendMessage(...)` — currently only the dev id resolves,
 * since that's the only extension installed during local development) and
 * by `lib/extension/cors.ts` (which origins `/api/extension/*` accepts —
 * still always an exact match, never a wildcard).
 */
export const EXTENSION_IDS = [
  "dngfnacmgpaglgoeealhgkfljnmekpoe", // local/unpacked dev build (pinned key)
  // "<chrome-web-store-id>", // add once published — see docs/ARCHITECTURE.md
] as const;

export const EXTENSION_ID = EXTENSION_IDS[0];

export const EXTENSION_ORIGINS = EXTENSION_IDS.map((id) => `chrome-extension://${id}`);
