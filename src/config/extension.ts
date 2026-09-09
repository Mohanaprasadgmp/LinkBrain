/**
 * Chrome extension configuration shared by the web app.
 *
 * `EXTENSION_ID` is deterministic, not secret: it's derived from the public
 * key pinned in `extension/manifest.json`'s `"key"` field (Chrome's own
 * algorithm — SHA-256 of the DER-encoded public key, first 16 bytes,
 * nibble-mapped to `a`–`p`), so every developer who loads that same
 * `extension/` folder unpacked gets this exact id. It's what lets
 * `components/extension/connect-panel.tsx` target the extension via
 * `chrome.runtime.sendMessage(EXTENSION_ID, ...)` and what
 * `lib/extension/cors.ts` allow-lists as the only origin permitted to call
 * `/api/extension/*`.
 *
 * Publishing to the Chrome Web Store later mints a *different* id — out of
 * scope for this phase (see `docs/ARCHITECTURE.md`'s "Known limitations"),
 * and this constant would need updating alongside it.
 */
export const EXTENSION_ID = "dngfnacmgpaglgoeealhgkfljnmekpoe";

export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;
