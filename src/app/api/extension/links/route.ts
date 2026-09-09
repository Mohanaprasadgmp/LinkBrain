import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAiConfigured } from "@/lib/ai/openai-client";
import { getCurrentUser } from "@/lib/auth/session";
import type { Link } from "@/lib/domain/types";
import { extensionPreflight, withExtensionCors } from "@/lib/extension/cors";
import { linkDetailUrl } from "@/lib/extension/app-url";
import { isRateLimited } from "@/lib/extension/rate-limit";
import { validateLinkRequest } from "@/lib/extension/validate-link-request";
import { createLinkForUser } from "@/lib/services/link-service";

/**
 * Phase 7: `createLinkForUser` schedules AI enrichment via `next/server`'s
 * `after()`, which runs within this same function invocation after the
 * response below has already been sent. The default duration is generous
 * on Vercel's Fluid Compute (300s), but this is set explicitly so the AI
 * call always has room regardless of platform default — see
 * `docs/ARCHITECTURE.md`'s "AI enrichment" section.
 */
export const maxDuration = 30;

/**
 * `POST /api/extension/links` — the Chrome extension's only mutation
 * endpoint. Deliberately thin: resolve the user, validate the body, call
 * `createLinkForUser` (the exact same logic `lib/actions/links.ts`'s
 * `createLink` Server Action calls) — never a second copy of "save a link."
 *
 * The authenticated user comes only from `getCurrentUser()`, which resolves
 * the session from request headers (a cookie for the web app, an
 * `Authorization: Bearer <token>` header for the extension — see
 * `lib/auth.ts`'s `bearer` plugin). A client-supplied `userId` is never
 * accepted as an authority claim — there is nowhere in this file that even
 * reads such a field from the request body.
 */
function summarize(link: Link) {
  return {
    id: link.id,
    title: link.title,
    domain: link.domain,
    status: link.status,
    detailUrl: linkDetailUrl(link.id),
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return withExtensionCors(
      request,
      NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 }),
    );
  }

  if (isRateLimited(user.id)) {
    return withExtensionCors(
      request,
      NextResponse.json(
        { ok: false, error: "Too many requests. Try again in a moment." },
        { status: 429 },
      ),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withExtensionCors(
      request,
      NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 }),
    );
  }

  const validated = validateLinkRequest(body);
  if (!validated.ok) {
    return withExtensionCors(
      request,
      NextResponse.json({ ok: false, error: validated.error }, { status: 400 }),
    );
  }

  const { input, force } = validated.data;
  const result = await createLinkForUser(user.id, input, { force });

  if (!result.ok) {
    return withExtensionCors(
      request,
      NextResponse.json(
        {
          ok: false,
          error: result.error,
          duplicate: result.duplicate ?? false,
          existingLink: result.existingLink ? summarize(result.existingLink) : undefined,
        },
        { status: result.duplicate ? 409 : 400 },
      ),
    );
  }

  return withExtensionCors(
    request,
    NextResponse.json(
      {
        ok: true,
        link: summarize(result.link),
        metadataApplied: result.metadataApplied,
        aiEnabled: isAiConfigured(),
      },
      { status: 201 },
    ),
  );
}

export async function OPTIONS(request: NextRequest) {
  return extensionPreflight(request);
}
