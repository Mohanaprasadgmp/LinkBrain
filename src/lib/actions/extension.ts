"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Hands the Chrome extension a bearer credential for the *current* browser
 * session, without the extension ever seeing a password.
 *
 * Called only from `components/extension/connect-panel.tsx`, itself only
 * rendered on `/extension` (inside `(workspace)`, so already gated by
 * `proxy.ts` + `requireUser()`). Being a Server Action, it's same-origin and
 * POST-only by construction — Next.js's own CSRF protection for actions
 * means this is not reachable cross-origin, unlike a Route Handler would be.
 *
 * `session.session.token` is Better Auth's own raw session-token field (see
 * `node_modules/better-auth/dist/db/schema.d.mts`) — the same value that
 * would otherwise sit in the (httpOnly) session cookie. Handing it to the
 * extension is exactly what the `bearer` plugin registered in `lib/auth.ts`
 * expects to receive back as `Authorization: Bearer <token>`; see
 * `docs/ARCHITECTURE.md`'s "Chrome extension" section for the full design
 * and why this reads the session object directly rather than relying on the
 * `set-auth-token` response header (which Better Auth only re-emits when a
 * session happens to be due for its periodic cookie refresh, not on every
 * call — not reliable enough for a one-shot handoff).
 */
export type ExtensionHandoff =
  | { ok: true; token: string; user: { id: string; name: string; email: string } }
  | { ok: false; error: string };

export async function getExtensionHandoffToken(): Promise<ExtensionHandoff> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "You must be signed in." };

  return {
    ok: true,
    token: session.session.token,
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
  };
}
