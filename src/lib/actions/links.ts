"use server";

import { revalidatePath } from "next/cache";

import { requireUserIdForAction } from "@/lib/auth/session";
import { getLinkRepository } from "@/lib/data";
import type {
  BulkLinkAction,
  Link,
  LinkStatus,
  LinkUpdate,
  NewLinkInput,
  Priority,
} from "@/lib/domain/types";
import { extractMetadata } from "@/lib/metadata";
import { isValidUrl, normalizeUrl } from "@/lib/utils/url";

import { err, ok, toErrorMessage, type ActionResult } from "./result";

/**
 * Server Actions for link mutations.
 *
 * Each one: resolves the authenticated user from the session (never a
 * client-supplied id — see `requireUserIdForAction`) and rejects the call if
 * there isn't one, validates what's cheap to validate before touching the
 * database, calls the repository (which owns the actual query/transaction
 * logic — kept out of here on purpose) through `.forUser(userId)` so every
 * query it makes is already scoped to that user, turns a thrown error into a
 * presentable message, and revalidates every route that displays link data
 * so the next render reflects the change.
 */

const LINK_PATHS = ["/", "/inbox", "/favorites", "/links", "/archive"] as const;

function revalidateLinkPaths() {
  for (const path of LINK_PATHS) revalidatePath(path);
}

/** Also revalidate a single link's own detail page, so an edit made elsewhere shows up there too. */
function revalidateLinkDetail(id: string) {
  revalidatePath(`/links/${id}`);
}

/**
 * `createLink`'s result is richer than the shared `ActionResult<T>`: a
 * successful save still needs to tell the dialog whether metadata came back
 * (so it can show "some details couldn't be retrieved" instead of silently
 * closing), and a rejected duplicate needs to carry the existing link so the
 * dialog can offer "Save anyway" without a second round trip to look it up.
 */
export type CreateLinkResult =
  | { ok: true; data: Link; metadataApplied: boolean }
  | { ok: false; error: string; duplicate?: true; existingLink?: Link };

export async function createLink(
  input: NewLinkInput,
  options: { force?: boolean } = {},
): Promise<CreateLinkResult> {
  if (!isValidUrl(input.url)) {
    return err("Enter a valid URL, e.g. https://example.com");
  }

  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  const repo = getLinkRepository().forUser(auth.userId);
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

    // Stage 1: the link is saved immediately with whatever the user
    // provided. Nothing below this line can undo it — a slow or broken
    // target site affects only whether the link gets enriched, never
    // whether it gets saved at all.
    let link = await repo.create(input);

    // Stage 2: best-effort enrichment. Only fields the user left blank are
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

    return { ok: true, data: link, metadataApplied };
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't save this link. Try again."));
  }
}

export async function updateLink(
  id: string,
  patch: LinkUpdate,
): Promise<ActionResult<Link>> {
  if (patch.url !== undefined && !isValidUrl(patch.url)) {
    return err("Enter a valid URL, e.g. https://example.com");
  }

  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const updated = await getLinkRepository().forUser(auth.userId).update(id, patch);
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    revalidateLinkDetail(id);
    revalidatePath("/projects");
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't save your changes. Try again."));
  }
}

export async function deleteLink(id: string): Promise<ActionResult<null>> {
  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const deleted = await getLinkRepository().forUser(auth.userId).delete(id);
    if (!deleted) return err("This link no longer exists.");
    revalidateLinkPaths();
    revalidateLinkDetail(id);
    revalidatePath("/projects");
    return ok(null);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't delete this link. Try again."));
  }
}

/**
 * Reads the current value before flipping it. For a single-user app this is
 * simple and correct; it isn't safe against two concurrent toggles racing
 * (a true atomic `NOT is_favorite` would need its own repository method) —
 * a gap worth knowing about, not worth building around before there's a
 * second concurrent writer.
 */
export async function toggleFavorite(id: string): Promise<ActionResult<Link>> {
  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const repo = getLinkRepository().forUser(auth.userId);
    const current = await repo.get(id);
    if (!current) return err("This link no longer exists.");

    const updated = await repo.update(id, { isFavorite: !current.isFavorite });
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    revalidateLinkDetail(id);
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update favorites. Try again."));
  }
}

export async function updateLinkStatus(
  id: string,
  status: LinkStatus,
): Promise<ActionResult<Link>> {
  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const updated = await getLinkRepository().forUser(auth.userId).update(id, { status });
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    revalidateLinkDetail(id);
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update status. Try again."));
  }
}

export async function updateLinkPriority(
  id: string,
  priority: Priority,
): Promise<ActionResult<Link>> {
  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const updated = await getLinkRepository().forUser(auth.userId).update(id, { priority });
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    revalidateLinkDetail(id);
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update priority. Try again."));
  }
}

export async function archiveLink(id: string): Promise<ActionResult<Link>> {
  return updateLinkStatus(id, "archived");
}

/**
 * Apply one bulk action to every selected link in a single repository call
 * (see `LinkRepository.bulkApply`) rather than looping `updateLink` per id —
 * one server round trip and (for most action types) one SQL statement for
 * however many links are selected. `bulkApply` itself silently skips any id
 * in `ids` that isn't owned by this user, so a tampered selection can't
 * touch anyone else's links.
 */
export async function bulkUpdateLinks(
  ids: string[],
  action: BulkLinkAction,
): Promise<ActionResult<{ updated: number }>> {
  if (ids.length === 0) {
    return err("No links selected.");
  }

  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const updated = await getLinkRepository().forUser(auth.userId).bulkApply(ids, action);
    revalidateLinkPaths();
    revalidatePath("/projects");
    for (const id of ids) revalidateLinkDetail(id);
    return ok({ updated });
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update those links. Try again."));
  }
}
