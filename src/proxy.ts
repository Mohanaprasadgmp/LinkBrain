import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Route protection for the whole app.
 *
 * Named `proxy` (not `middleware`) deliberately: this Next.js version
 * deprecated and renamed the `middleware.ts` file convention to `proxy.ts` —
 * see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 * A file named `middleware.ts` here would simply never run.
 *
 * Only an **optimistic** cookie-presence check, per both the Next.js docs'
 * and Better Auth's own guidance for this layer — fast, no database round
 * trip, safe to run on every request. It is not the authoritative check:
 * every page also calls `requireUserId()` (`lib/auth/session.ts`), and every
 * Server Action calls `requireUserIdForAction()`, both of which validate the
 * session against the database. This layer exists only to redirect obviously
 * signed-out visitors before they render a workspace page at all.
 */
const AUTH_PATHS = ["/sign-in", "/sign-up"];

/**
 * Public informational pages (Phase 6B: `/privacy`, `/terms`) — reachable
 * whether or not the visitor is signed in. Unlike `AUTH_PATHS`, a signed-in
 * visitor is never redirected away from these; they're just always allowed.
 */
const PUBLIC_PATHS = ["/privacy", "/terms"];

function matchesPath(paths: string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && !matchesPath(AUTH_PATHS, pathname) && !matchesPath(PUBLIC_PATHS, pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (sessionCookie && matchesPath(AUTH_PATHS, pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
