/**
 * Tag helpers.
 *
 * Tags live on links as display strings (`"DynamoDB"`). Matching and counting
 * are done on a slug (`"dynamodb"`) so that casing and spacing never split one
 * concept into two tags — the same normalisation Postgres now enforces via
 * `tags.slug`'s unique constraint (see `lib/db/schema/tags.ts`).
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
