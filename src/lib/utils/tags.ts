import type { Link, Tag } from "@/lib/domain/types";

/**
 * Tag helpers.
 *
 * Tags live on links as display strings (`"DynamoDB"`). Matching and counting
 * are done on a slug (`"dynamodb"`) so that casing and spacing never split one
 * concept into two tags.
 */

export function slugifyTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Split a comma-separated tag input into clean, de-duplicated display tags. */
export function parseTagInput(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of input.split(",")) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const slug = slugifyTag(tag);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    tags.push(tag);
  }

  return tags;
}

/**
 * Derive the tag list from links, counting how many links carry each tag.
 *
 * Deriving rather than storing means counts can never drift out of sync with
 * the links themselves. The first spelling encountered wins as the display
 * label, and the result is sorted by count so the busiest tags surface first.
 */
export function deriveTags(links: Link[]): Tag[] {
  const bySlug = new Map<string, Tag>();

  for (const link of links) {
    for (const tag of link.tags) {
      const slug = slugifyTag(tag);
      if (!slug) continue;

      const existing = bySlug.get(slug);
      if (existing) {
        existing.linkCount += 1;
      } else {
        bySlug.set(slug, { slug, label: tag, linkCount: 1 });
      }
    }
  }

  return [...bySlug.values()].sort(
    (a, b) => b.linkCount - a.linkCount || a.label.localeCompare(b.label),
  );
}
