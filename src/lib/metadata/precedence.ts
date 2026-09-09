import type { PageMetadata, RawPageFields } from "./types";

/**
 * Applies the documented precedence rules over raw parsed fields. Pure —
 * no fetching, no DOM — so this is trivially unit-testable with plain
 * objects rather than needing HTML fixtures.
 *
 * Title: og:title -> <title> -> null. (The URL-derived fallback,
 * `titleFromUrl()`, is applied by the repository/action layer when the page
 * offers nothing at all — this module only knows what the page itself says.)
 *
 * Description: og:description -> meta description -> null.
 *
 * Image: og:image -> twitter:image -> null.
 *
 * Favicon: first `<link rel="icon">` / `rel="shortcut icon"` in document
 * order -> `<link rel="apple-touch-icon">` -> a same-origin `/favicon.ico`
 * guess -> null. Relative URLs are resolved against the page's final
 * (post-redirect) URL. The `/favicon.ico` guess is never verified with an
 * extra request — a dead link degrades through the client-side `<img>`
 * fallback instead, which is cheaper than a HEAD request on every save.
 *
 * Site name (og:site_name) is parsed by `parse-html.ts` but deliberately not
 * included in `PageMetadata` — nothing in the UI displays a site name
 * distinct from the `domain` column that already exists, so persisting it
 * would be exactly the "duplicate metadata column" this phase was told to
 * avoid.
 */
export function applyPrecedence(fields: RawPageFields, finalUrl: string): PageMetadata {
  const base = safeUrl(finalUrl);

  return {
    title: fields.ogTitle || fields.htmlTitle || null,
    description: fields.ogDescription || fields.metaDescription || null,
    imageUrl: resolveAgainst(fields.ogImage || fields.twitterImage, base),
    faviconUrl: resolveAgainst(pickFavicon(fields.iconLinks), base) ?? guessFaviconPath(base),
  };
}

function pickFavicon(iconLinks: RawPageFields["iconLinks"]): string | null {
  const declared = iconLinks.find((link) => link.rel === "icon" || link.rel === "shortcut icon");
  if (declared) return declared.href;

  const appleTouch = iconLinks.find((link) => link.rel.includes("apple-touch-icon"));
  return appleTouch?.href ?? null;
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resolveAgainst(value: string | null, base: URL | null): string | null {
  if (!value || !base) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function guessFaviconPath(base: URL | null): string | null {
  if (!base) return null;
  try {
    return new URL("/favicon.ico", base).toString();
  } catch {
    return null;
  }
}
