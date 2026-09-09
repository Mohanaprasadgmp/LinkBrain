import * as cheerio from "cheerio";

/**
 * Turns raw HTML (already fetched and size-limited by `lib/metadata/fetch-page.ts`
 * — see `extractMetadata`'s `html` field) into clean, bounded plain text for
 * the AI prompt. Never fetches anything itself.
 *
 * Cost/safety bound: `MAX_CHARS` caps input sent to OpenAI regardless of how
 * long the source page is — roughly 2,000 tokens' worth, generous enough for
 * a real summary and cheap enough to matter for a limited API budget. This
 * is defense-in-depth alongside `max_output_tokens` on the *response* side
 * (`lib/ai/ai-service.ts`) — the two bound input and output independently.
 */
const MAX_CHARS = 6000;

const REMOVED_SELECTORS = "script, style, noscript, svg, template, nav, footer, header, iframe";

export function extractPageText(html: string): string | null {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return null;
  }

  $(REMOVED_SELECTORS).remove();

  const raw = $("body").text() || $.root().text();
  const normalized = raw
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  return normalized.length > MAX_CHARS ? `${normalized.slice(0, MAX_CHARS)}…` : normalized;
}
