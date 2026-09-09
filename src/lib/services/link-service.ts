import "server-only";

import { revalidatePath } from "next/cache";

import { getLinkRepository } from "@/lib/data";
import type { Link, LinkUpdate, NewLinkInput } from "@/lib/domain/types";
import { extractMetadata } from "@/lib/metadata";
import { isValidUrl, normalizeUrl } from "@/lib/utils/url";

/**
 * The one authoritative implementation of "save a link for this user" —
 * duplicate check, create, best-effort metadata enrichment, revalidation.
 *
 * Extracted out of `lib/actions/links.ts`'s `createLink` (which now just
 * resolves the session and calls this) so the Chrome extension's API route
 * (`app/api/extension/links/route.ts`) can call the exact same logic instead
 * of a second, extension-only copy. Neither caller goes through the other —
 * both call this directly. `userId` must already be resolved from an
 * authenticated session by the caller; this function trusts it completely
 * and never re-derives it.
 */

/** Conservative sanity caps — reject obviously-abusive payloads without constraining a normal save. */
export const LINK_INPUT_LIMITS = {
  url: 2048,
  title: 300,
  description: 1000,
  note: 5000,
} as const;

export type CreateLinkServiceResult =
  | { ok: true; link: Link; metadataApplied: boolean }
  | { ok: false; error: string; duplicate?: true; existingLink?: Link };

function tooLong(value: string | undefined, max: number): boolean {
  return value !== undefined && value.length > max;
}

export async function createLinkForUser(
  userId: string,
  input: NewLinkInput,
  options: { force?: boolean } = {},
): Promise<CreateLinkServiceResult> {
  if (!isValidUrl(input.url)) {
    return { ok: false, error: "Enter a valid URL, e.g. https://example.com" };
  }
  if (
    tooLong(input.url, LINK_INPUT_LIMITS.url) ||
    tooLong(input.title, LINK_INPUT_LIMITS.title) ||
    tooLong(input.description, LINK_INPUT_LIMITS.description) ||
    tooLong(input.note, LINK_INPUT_LIMITS.note)
  ) {
    return { ok: false, error: "One of the fields is too long." };
  }

  const repo = getLinkRepository().forUser(userId);
  const normalized = normalizeUrl(input.url) ?? input.url;

  try {
    if (!options.force) {
      const existing = await repo.findByUrl(normalized);
      if (existing) {
        return {
          ok: false,
          error: "You've already saved this link.",
          duplicate: true,
          existingLink: existing,
        };
      }
    }

    // Stage 1: the link is saved immediately with whatever the caller
    // provided. Nothing below this line can undo it — a slow or broken
    // target site affects only whether the link gets enriched, never
    // whether it gets saved at all.
    let link = await repo.create(input);

    // Stage 2: best-effort enrichment. Only fields the caller left blank are
    // ever overwritten — checked against the original `input`, not `link`,
    // since repo.create() has already filled a blank title with a
    // URL-derived guess by this point. `repo` is still this same user's
    // scoped repository, so this update can only ever touch the link just
    // created for them.
    let metadataApplied = false;
    try {
      const metadataResult = await extractMetadata(link.url);
      if (metadataResult.ok) {
        metadataApplied = true;
        const { title, description, imageUrl, faviconUrl } = metadataResult.metadata;

        const patch: LinkUpdate = {};
        if (!input.title.trim() && title) patch.title = title;
        if (!input.description?.trim() && description) patch.description = description;
        if (faviconUrl) patch.favicon = faviconUrl;
        if (imageUrl) patch.previewImage = imageUrl;

        if (Object.keys(patch).length > 0) {
          link = (await repo.update(link.id, patch)) ?? link;
        }
      }
    } catch {
      // extractMetadata is designed to never throw (every internal failure
      // resolves to { ok: false, reason }), but a save must never be lost to
      // enrichment regardless — so this catch exists as a second, defensive
      // guarantee of that, not because a throw is expected in practice.
    }

    revalidateLinkPaths();
    if (link.projectId) revalidatePath("/projects");

    return { ok: true, link, metadataApplied };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : undefined;
    return { ok: false, error: message ?? "Couldn't save this link. Try again." };
  }
}

const LINK_PATHS = ["/", "/inbox", "/favorites", "/links", "/archive"] as const;

function revalidateLinkPaths() {
  for (const path of LINK_PATHS) revalidatePath(path);
}
