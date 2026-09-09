import { APP_URL } from "./config.js";
import { clearStoredAuth, getStoredAuth } from "./auth-storage.js";
import type { SaveLinkRequest, SaveLinkResponse, StoredProject } from "./types.js";

/**
 * Every call attaches the stored bearer token and never anything else — no
 * cookies, no client-supplied user id. A 401 from any endpoint means the
 * server has rejected the credential (expired, revoked, or simply missing);
 * this always clears local storage in that case rather than ever continuing
 * to act as if the extension were still authenticated, per the brief's
 * "never continue assuming authenticated state after rejection."
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; sessionExpired?: boolean };

/** A GET call's outcome, before the caller decodes its own success body. */
type FetchOutcome = { ok: true; response: Response } | { ok: false; error: string; sessionExpired?: boolean };

async function authedFetch(path: string, init: RequestInit = {}): Promise<FetchOutcome> {
  const auth = await getStoredAuth();
  if (!auth) return { ok: false, error: "Not signed in.", sessionExpired: true };

  let response: Response;
  try {
    response = await fetch(`${APP_URL}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${auth.token}` },
    });
  } catch {
    return { ok: false, error: "Couldn't reach LinkBrain. Check your connection." };
  }

  if (response.status === 401) {
    await clearStoredAuth();
    return { ok: false, error: "Your LinkBrain session has expired.", sessionExpired: true };
  }
  if (response.status === 429) {
    return { ok: false, error: "Too many requests. Try again in a moment." };
  }

  return { ok: true, response };
}

export async function fetchSession(): Promise<
  ApiResult<{ id: string; name: string; email: string }>
> {
  const outcome = await authedFetch("/api/extension/session");
  if (!outcome.ok) return outcome;
  if (!outcome.response.ok) return { ok: false, error: "Couldn't reach LinkBrain." };

  const body = (await outcome.response.json()) as { user: { id: string; name: string; email: string } };
  return { ok: true, data: body.user };
}

export async function fetchProjects(): Promise<ApiResult<StoredProject[]>> {
  const outcome = await authedFetch("/api/extension/projects");
  if (!outcome.ok) return outcome;
  if (!outcome.response.ok) return { ok: false, error: "Couldn't load projects." };

  const body = (await outcome.response.json()) as { projects: StoredProject[] };
  return { ok: true, data: body.projects };
}

/**
 * A create call's own body carries "duplicate"/"validation error" as normal,
 * successfully-transported JSON (see `SaveLinkResponse`) — only a transport
 * failure (network/auth/rate-limit) is treated as this function's own error.
 */
export async function saveLink(request: SaveLinkRequest): Promise<ApiResult<SaveLinkResponse>> {
  const outcome = await authedFetch("/api/extension/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!outcome.ok) return outcome;

  try {
    const body = (await outcome.response.json()) as SaveLinkResponse;
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: "Couldn't reach LinkBrain. Check your connection." };
  }
}
