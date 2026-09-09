import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseHtml } from "./parse-html";

function fixture(name: string): string {
  return readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");
}

describe("parseHtml", () => {
  it("extracts every supported tag from a fully-tagged page", () => {
    const fields = parseHtml(fixture("full-og.html"));

    expect(fields.htmlTitle).toBe("HTML Title Tag");
    expect(fields.metaDescription).toBe("The plain meta description.");
    expect(fields.ogTitle).toBe("OG Title");
    expect(fields.ogDescription).toBe("The OG description.");
    expect(fields.ogImage).toBe("/images/og-cover.png");
    expect(fields.ogSiteName).toBe("Example Site");
    expect(fields.twitterTitle).toBe("Twitter Title");
    expect(fields.twitterDescription).toBe("The twitter description.");
    expect(fields.twitterImage).toBe("https://cdn.example.com/twitter-card.png");
    expect(fields.iconLinks).toEqual([
      { rel: "icon", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ]);
  });

  it("falls back to plain title and meta description when there are no OG/Twitter tags", () => {
    const fields = parseHtml(fixture("title-and-description-only.html"));

    expect(fields.htmlTitle).toBe("Plain Page Title");
    expect(fields.metaDescription).toBe(
      "Just a plain meta description, no OG tags at all.",
    );
    expect(fields.ogTitle).toBeNull();
    expect(fields.ogDescription).toBeNull();
    expect(fields.ogImage).toBeNull();
  });

  it("extracts Twitter tags and a shortcut icon when that's all a page has", () => {
    const fields = parseHtml(fixture("twitter-only.html"));

    expect(fields.twitterTitle).toBe("Twitter-only Title");
    expect(fields.twitterDescription).toBe("Twitter-only description.");
    expect(fields.twitterImage).toBe("tw-image.jpg");
    expect(fields.iconLinks).toEqual([{ rel: "shortcut icon", href: "favicon.ico" }]);
  });

  it("returns all nulls and an empty icon list for a page with no metadata", () => {
    const fields = parseHtml(fixture("empty.html"));

    expect(fields.htmlTitle).toBeNull();
    expect(fields.metaDescription).toBeNull();
    expect(fields.ogTitle).toBeNull();
    expect(fields.ogImage).toBeNull();
    expect(fields.iconLinks).toEqual([]);
  });

  it("extracts what it can from malformed HTML without throwing", () => {
    const fields = parseHtml(fixture("malformed.html"));

    expect(fields.ogTitle).toBe("OG title survives despite the mess");
    expect(fields.iconLinks).toEqual([{ rel: "icon", href: "/broken-favicon.ico" }]);
  });

  it("does not throw on a completely empty string", () => {
    expect(() => parseHtml("")).not.toThrow();
    const fields = parseHtml("");
    expect(fields.htmlTitle).toBeNull();
  });
});
