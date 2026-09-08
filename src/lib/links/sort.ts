import { PRIORITY_META } from "@/lib/domain/priority";
import type { Link, LinkSort } from "@/lib/domain/types";

export interface SortOption {
  value: LinkSort;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "recently-updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
  { value: "priority", label: "Priority" },
];

/**
 * Return a sorted copy of `links`.
 *
 * Copies rather than sorting in place, because callers frequently hold state
 * arrays that must not be mutated.
 */
export function sortLinks(links: Link[], sort: LinkSort): Link[] {
  const sorted = [...links];

  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));
    case "oldest":
      return sorted.sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt));
    case "recently-updated":
      return sorted.sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "priority":
      // Ties within a priority band fall back to newest, so the most urgent
      // and most recent link lands at the top.
      return sorted.sort(
        (a, b) =>
          PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight ||
          timestamp(b.createdAt) - timestamp(a.createdAt),
      );
    default:
      return sorted;
  }
}

function timestamp(iso: string): number {
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
}
