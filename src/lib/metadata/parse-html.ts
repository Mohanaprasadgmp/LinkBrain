import * as cheerio from "cheerio";

import type { RawPageFields } from "./types";

/**
 * Extracts the raw, un-prioritised metadata candidates from an HTML
 * document. Pure and framework-free: takes a string, returns data — no
 * fetching, no precedence decisions (see `precedence.ts` for those).
 *
 * Uses cheerio, a static HTML parser that never executes scripts — a direct
 * fit for "only retrieve HTML, don't run the page." Built on htmlparser2,
 * which is deliberately forgiving of malformed markup (real-world pages are
 * rarely fully spec-compliant), so this doesn't throw on broken HTML — it
 * just extracts whatever it can find.
 */
export function parseHtml(html: string): RawPageFields {
  const $ = cheerio.load(html);

  const iconLinks: RawPageFields["iconLinks"] = [];
  $("link[rel]").each((_, el) => {
    const rel = ($(el).attr("rel") ?? "").trim().toLowerCase();
    const href = $(el).attr("href")?.trim();
    if (href && rel.includes("icon")) {
      iconLinks.push({ rel, href });
    }
  });

  return {
    htmlTitle: $("title").first().text().trim() || null,
    metaDescription: findMeta($, "name", "description"),
    ogTitle: findMeta($, "property", "og:title"),
    ogDescription: findMeta($, "property", "og:description"),
    ogImage: findMeta($, "property", "og:image"),
    // Parsed for completeness (the brief explicitly lists og:site_name among
    // supported tags) even though the current precedence rules don't
    // persist it as its own field — see precedence.ts's doc comment.
    ogSiteName: findMeta($, "property", "og:site_name"),
    twitterTitle: findMeta($, "name", "twitter:title"),
    twitterDescription: findMeta($, "name", "twitter:description"),
    twitterImage: findMeta($, "name", "twitter:image"),
    iconLinks,
  };
}

/**
 * Finds a `<meta>` tag by `name`/`property`, matching case-insensitively —
 * real-world (especially hand-written) pages aren't always consistent about
 * casing, and this is cheap robustness against that.
 */
function findMeta(
  $: cheerio.CheerioAPI,
  attr: "name" | "property",
  key: string,
): string | null {
  let found: string | null = null;

  $(`meta[${attr}]`).each((_, el) => {
    if (found !== null) return;
    const value = $(el).attr(attr);
    if (value?.trim().toLowerCase() === key) {
      const content = $(el).attr("content")?.trim();
      if (content) found = content;
    }
  });

  return found;
}
