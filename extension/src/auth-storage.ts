import type { StoredAuth } from "./types.js";

/**
 * The single place this extension reads or writes `chrome.storage.local`.
 *
 * Exactly two things are ever stored: the bearer token (Better Auth's own
 * session token — see `docs/ARCHITECTURE.md`'s "Chrome extension" section)
 * and the display-only `{id, name, email}` the popup shows. No password, no
 * database credential, no Better Auth secret, no Google credential — those
 * never leave the server. `chrome.storage.local` is sandboxed per-extension
 * by Chrome; nothing here encrypts it further, matching the brief's own
 * framing of "Chrome's extension storage APIs" as the intended place for
 * this kind of credential.
 */
const STORAGE_KEY = "linkbrain-auth";

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return isStoredAuth(value) ? value : null;
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: auth });
}

export async function clearStoredAuth(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

function isStoredAuth(value: unknown): value is StoredAuth {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredAuth>;
  return (
    typeof candidate.token === "string" &&
    typeof candidate.user === "object" &&
    candidate.user !== null &&
    typeof candidate.user.id === "string"
  );
}
