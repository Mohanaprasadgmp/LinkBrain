"use server";

import { revalidatePath } from "next/cache";

import { getLinkRepository } from "@/lib/data";
import type {
  Link,
  LinkStatus,
  LinkUpdate,
  NewLinkInput,
  Priority,
} from "@/lib/domain/types";
import { isValidUrl } from "@/lib/utils/url";

import { err, ok, toErrorMessage, type ActionResult } from "./result";

/**
 * Server Actions for link mutations.
 *
 * Each one: validates what's cheap to validate before touching the database,
 * calls the repository (which owns the actual query/transaction logic — kept
 * out of here on purpose), turns a thrown error into a presentable message,
 * and revalidates every route that displays link data so the next render
 * reflects the change.
 */

const LINK_PATHS = ["/", "/inbox", "/favorites", "/links", "/archive", "/tags"] as const;

function revalidateLinkPaths() {
  for (const path of LINK_PATHS) revalidatePath(path);
}

export async function createLink(input: NewLinkInput): Promise<ActionResult<Link>> {
  if (!isValidUrl(input.url)) {
    return err("Enter a valid URL, e.g. https://example.com");
  }

  try {
    const link = await getLinkRepository().create(input);
    revalidateLinkPaths();
    if (link.projectId) revalidatePath("/projects");
    return ok(link);
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

  try {
    const updated = await getLinkRepository().update(id, patch);
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    revalidatePath("/projects");
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't save your changes. Try again."));
  }
}

export async function deleteLink(id: string): Promise<ActionResult<null>> {
  try {
    const deleted = await getLinkRepository().delete(id);
    if (!deleted) return err("This link no longer exists.");
    revalidateLinkPaths();
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
  try {
    const repo = getLinkRepository();
    const current = await repo.get(id);
    if (!current) return err("This link no longer exists.");

    const updated = await repo.update(id, { isFavorite: !current.isFavorite });
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update favorites. Try again."));
  }
}

export async function updateLinkStatus(
  id: string,
  status: LinkStatus,
): Promise<ActionResult<Link>> {
  try {
    const updated = await getLinkRepository().update(id, { status });
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update status. Try again."));
  }
}

export async function updateLinkPriority(
  id: string,
  priority: Priority,
): Promise<ActionResult<Link>> {
  try {
    const updated = await getLinkRepository().update(id, { priority });
    if (!updated) return err("This link no longer exists.");
    revalidateLinkPaths();
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't update priority. Try again."));
  }
}

export async function archiveLink(id: string): Promise<ActionResult<Link>> {
  return updateLinkStatus(id, "archived");
}
