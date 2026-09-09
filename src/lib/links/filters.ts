import type { Link, LinkFilter } from "@/lib/domain/types";
import { searchLinks } from "./search";

/**
 * Apply a `LinkFilter` to a list of links.
 *
 * Composed of small predicates rather than one large conditional so that each
 * criterion can be reasoned about — and later translated into a database
 * `where` clause — independently.
 */
export function filterLinks(links: Link[], filter: LinkFilter): Link[] {
  let result = links;

  if (filter.status?.length) {
    const allowed = new Set(filter.status);
    result = result.filter((link) => allowed.has(link.status));
  }

  if (filter.priority?.length) {
    const allowed = new Set(filter.priority);
    result = result.filter((link) => allowed.has(link.priority));
  }

  if (filter.projectId) {
    result = result.filter((link) => link.projectId === filter.projectId);
  }

  if (filter.isFavorite !== undefined) {
    result = result.filter((link) => link.isFavorite === filter.isFavorite);
  }

  // Text search runs last, over the already-narrowed set.
  if (filter.query) {
    result = searchLinks(result, filter.query);
  }

  return result;
}

/**
 * Whether a filter would actually narrow anything.
 *
 * Used to decide between an "empty library" and a "nothing matched your
 * filters" empty state, which need different wording and different actions.
 */
export function isFilterActive(filter: LinkFilter): boolean {
  return Boolean(
    filter.query?.trim() ||
      filter.status?.length ||
      filter.priority?.length ||
      filter.projectId ||
      filter.isFavorite !== undefined,
  );
}
