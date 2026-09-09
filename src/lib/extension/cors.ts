import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { EXTENSION_ORIGINS } from "@/config/extension";

/**
 * CORS, scoped narrowly to the three `app/api/extension/*` routes only —
 * nothing else in this app changes its CORS behaviour for the extension.
 * `Access-Control-Allow-Origin` is always one exact pinned extension origin
 * from `EXTENSION_ORIGINS`, never `*` and never a reflected arbitrary
 * `Origin` header: the brief is explicit that a wildcard is not an
 * acceptable way to solve this. `EXTENSION_ORIGINS` is a short, fixed list
 * (currently just the dev id) rather than a single value, so adding the
 * Chrome Web Store id later — see `config/extension.ts` — doesn't change
 * this file at all. No `Access-Control-Allow-Credentials` is needed since
 * these routes are bearer-authenticated, not cookie-authenticated.
 */
const ALLOWED_HEADERS = "Authorization, Content-Type";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

function isAllowedOrigin(origin: string | null): boolean {
  return origin !== null && (EXTENSION_ORIGINS as readonly string[]).includes(origin);
}

/** Attach CORS headers to a response, only when the request's Origin is one of the pinned extension origins. */
export function withExtensionCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/** Handles the `OPTIONS` preflight every `Authorization`/JSON request from the extension triggers. */
export function extensionPreflight(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");
  return withExtensionCors(request, response);
}
