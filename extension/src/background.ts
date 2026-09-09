import { setStoredAuth } from "./auth-storage.js";
import type { ConnectMessage } from "./types.js";

/**
 * Listens for the handoff message from the LinkBrain web app's `/extension`
 * connect page. `onMessageExternal` only ever fires for pages matched by
 * this extension's own `manifest.json` `externally_connectable.matches` —
 * Chrome enforces that before this handler ever runs, so `sender.origin` is
 * checked again here only as defense-in-depth, not as the primary guard.
 */
/**
 * Kept in sync with `manifest.json`'s `externally_connectable.matches` —
 * that field is the actual enforcement point (Chrome won't invoke this
 * listener at all for a non-matching page), this list only re-checks it.
 * Add the hosted LinkBrain origin to both before packaging for a deployed
 * instance (see `README.md`'s "Hosted configuration" section) — e.g.
 * "https://linkbrain.example.com". Keeping `localhost` here too is
 * deliberate even in a production package: it costs nothing (Chrome only
 * ever calls this listener for a page `externally_connectable.matches`
 * already allowed) and means the same build still works against a local
 * dev server if ever needed.
 */
const TRUSTED_ORIGINS = [
  "http://localhost:3000",
  // "https://<your-hosted-domain>", // add once deployed — see README.md
];

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isConnectMessage(message)) return false;

  if (!TRUSTED_ORIGINS.includes(sender.origin ?? "")) {
    sendResponse({ ok: false });
    return false;
  }

  setStoredAuth({ token: message.token, user: message.user })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));

  // Keep the message channel open for the async `sendResponse` above.
  return true;
});

function isConnectMessage(message: unknown): message is ConnectMessage {
  if (typeof message !== "object" || message === null) return false;
  const candidate = message as Partial<ConnectMessage>;
  return (
    candidate.type === "linkbrain:connect" &&
    typeof candidate.token === "string" &&
    typeof candidate.user === "object" &&
    candidate.user !== null &&
    typeof candidate.user.id === "string"
  );
}
