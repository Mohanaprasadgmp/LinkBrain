import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

/**
 * The Data Access Layer for the current request's session — the one place
 * every page, view, and Server Action goes to find out who's signed in,
 * following the Next.js docs' own recommended DAL pattern (a single
 * `cache()`-memoized session read per request, rather than every call site
 * re-deriving it).
 *
 * Two call shapes, because a page and a Server Action need to fail
 * differently: a page can redirect straight to `/sign-in`, but a Server
 * Action is normally invoked as a fetch/RPC call from a page the user is
 * already on — redirecting out from under it is more surprising than
 * returning the same `{ok:false,error}` shape every other action failure
 * already returns.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id ?? null;
});

/**
 * The shape UI components need (name/email/image) — derived from
 * `getCurrentUser`'s own return type rather than importing Better Auth's
 * user type directly, so a client component like `UserMenu` can import just
 * this type without pulling in `lib/auth.ts` (which is `server-only` and
 * wires up the whole database-backed auth config).
 */
export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages/Server Components. `proxy.ts` already redirects unauthenticated requests before they get here — this is the second, defense-in-depth check, close to the data. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/sign-in");
  return userId;
}

/** Same as `requireUserId()`, for the (few) call sites that also need the display name/email/image, not just the id. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For Server Actions — never trust a client-supplied user id, always resolve it from the session. */
export async function requireUserIdForAction(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "You must be signed in." };
  return { ok: true, userId };
}
