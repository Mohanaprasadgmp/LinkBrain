/**
 * URL helpers.
 *
 * Everything here is pure string work on the client. No network request is
 * made to resolve titles, favicons or metadata — that arrives in a later phase
 * via a server-side metadata extractor.
 */

/**
 * Reduce a URL to a display hostname: no protocol, no `www.`, no trailing slash.
 *
 * Returns an empty string for input that cannot be parsed, so callers can treat
 * the result as "unknown domain" without a try/catch.
 */
export function extractDomain(url: string): string {
  const parsed = safeParseUrl(url);
  if (!parsed) return "";
  return parsed.hostname.replace(/^www\./, "");
}

/**
 * Parse a URL, tolerating input typed without a protocol.
 *
 * `example.com/page` is what a person pastes; `new URL()` rejects it outright,
 * so we retry with `https://` prepended before giving up.
 */
export function safeParseUrl(url: string): URL | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname.includes(".")) return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/** Whether a string can be understood as a web URL. */
export function isValidUrl(url: string): boolean {
  const parsed = safeParseUrl(url);
  return parsed !== null && (parsed.protocol === "http:" || parsed.protocol === "https:");
}

/** Normalise user input into a full URL string, or `null` if unparseable. */
export function normalizeUrl(url: string): string | null {
  const parsed = safeParseUrl(url);
  return parsed ? parsed.toString() : null;
}

/**
 * Derive a reasonable fallback title from a URL.
 *
 * Used when the user saves a link without typing a title. Once real metadata
 * extraction exists this becomes the fallback rather than the primary source.
 */
export function titleFromUrl(url: string): string {
  const parsed = safeParseUrl(url);
  if (!parsed) return url.trim();

  const lastSegment = parsed.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  if (!lastSegment) return extractDomain(url);

  return lastSegment
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}
