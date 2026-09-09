import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { EXTENSION_ORIGIN } from "@/config/extension";

/**
 * CORS, scoped narrowly to the three `app/api/extension/*` routes only —
 * nothing else in this app changes its CORS behaviour for the extension.
 * `Access-Control-Allow-Origin` is always the exact pinned extension origin,
 * never `*`: the brief is explicit that a wildcard origin is not an
 * acceptable way to solve this. No `Access-Control-Allow-Credentials` is
 * needed since these routes are bearer-authenticated, not cookie-authenticated.
 */
const ALLOWED_HEADERS = "Authorization, Content-Type";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

function isAllowedOrigin(origin: string | null): boolean {
  return origin === EXTENSION_ORIGIN;
}

/** Attach CORS headers to a response, only when the request's Origin is the pinned extension origin. */
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
