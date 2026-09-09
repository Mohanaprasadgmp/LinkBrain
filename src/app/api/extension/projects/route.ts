import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getProjectRepository } from "@/lib/data";
import { extensionPreflight, withExtensionCors } from "@/lib/extension/cors";

/**
 * `GET /api/extension/projects` — the current user's own projects, for the
 * popup's project picker. `getProjectRepository().forUser(user.id)` is the
 * same type-level guarantee every other project list in this app already
 * relies on (see `lib/data/repository.ts`'s doc comment): there is no
 * unscoped `list()` to call by accident, so this can never return another
 * user's projects regardless of what the extension sends.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return withExtensionCors(
      request,
      NextResponse.json({ ok: false, error: "You must be signed in." }, { status: 401 }),
    );
  }

  const projects = await getProjectRepository().forUser(user.id).list();

  return withExtensionCors(
    request,
    NextResponse.json({
      ok: true,
      projects: projects.map((project) => ({ id: project.id, name: project.name })),
    }),
  );
}

export async function OPTIONS(request: NextRequest) {
  return extensionPreflight(request);
}
