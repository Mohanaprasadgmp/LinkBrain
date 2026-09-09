import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { extensionPreflight, withExtensionCors } from "@/lib/extension/cors";

/**
 * `GET /api/extension/session` — lets the popup check "am I still signed
 * in?" on open, and lets it detect session expiry/revocation proactively
 * (a `sign out` on the web app, or the session simply expiring, both show up
 * here as a 401 the same way they would on `/api/extension/links`). Returns
 * only the display fields the popup needs — never anything session- or
 * credential-shaped.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return withExtensionCors(
      request,
      NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 }),
    );
  }

  return withExtensionCors(
    request,
    NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    }),
  );
}

export async function OPTIONS(request: NextRequest) {
  return extensionPreflight(request);
}
