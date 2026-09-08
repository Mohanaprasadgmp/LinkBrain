import type { Link } from "@/lib/domain/types";

/**
 * Local, in-memory link search.
 *
 * This is deliberately a pure function over an array so that it can be called
 * from a client component today and from a server route tomorrow. When real
 * full-text or vector search arrives, the call sites stay identical — only the
 * implementation behind this signature changes.
 */

/** Fields a query is matched against, in the order they are weighted. */
const SEARCHABLE_FIELDS = [
  "title",
  "domain",
  "description",
  "tags",
] as const;

export type SearchableField = (typeof SEARCHABLE_FIELDS)[number];

/**
 * Filter links by a free-text query.
 *
 * Every whitespace-separated term must match somewhere in the link (AND across
 * terms, OR across fields), which makes narrowing feel predictable as the user
 * keeps typing. An empty query returns the input untouched.
 */
export function searchLinks(links: Link[], query: string): Link[] {
  const terms = tokenize(query);
  if (terms.length === 0) return links;

  return links.filter((link) => {
    const haystack = buildHaystack(link);
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Score how well a link matches a query, higher being better.
 *
 * Title matches outrank domain, then description, then tags, so that searching
 * "aws" surfaces a link titled "AWS..." above one merely tagged `aws`. Returns
 * 0 when the link does not match at all.
 */
export function scoreLink(link: Link, query: string): number {
  const terms = tokenize(query);
  if (terms.length === 0) return 0;

  const fields: Record<SearchableField, string> = {
    title: link.title.toLowerCase(),
    domain: link.domain.toLowerCase(),
    description: link.description.toLowerCase(),
    tags: link.tags.join(" ").toLowerCase(),
  };

  const weights: Record<SearchableField, number> = {
    title: 8,
    domain: 4,
    description: 2,
    tags: 3,
  };

  let score = 0;

  for (const term of terms) {
    let matchedTerm = false;

    for (const field of SEARCHABLE_FIELDS) {
      const value = fields[field];
      if (!value.includes(term)) continue;

      matchedTerm = true;
      score += weights[field];
      // A term that starts a field is a stronger signal than one buried in it.
      if (value.startsWith(term)) score += weights[field] / 2;
    }

    // Require every term to match, mirroring `searchLinks`.
    if (!matchedTerm) return 0;
  }

  return score;
}

/** Split a query into lowercase terms, discarding empty fragments. */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/** Flatten the searchable fields of a link into one lowercase string. */
function buildHaystack(link: Link): string {
  return [link.title, link.domain, link.description, link.tags.join(" ")]
    .join(" ")
    .toLowerCase();
}
