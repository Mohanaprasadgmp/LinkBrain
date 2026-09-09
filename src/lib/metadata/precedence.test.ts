import { describe, expect, it } from "vitest";

import { applyPrecedence } from "./precedence";
import type { RawPageFields } from "./types";

const EMPTY_FIELDS: RawPageFields = {
  htmlTitle: null,
  metaDescription: null,
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
  ogSiteName: null,
  twitterTitle: null,
  twitterDescription: null,
  twitterImage: null,
  iconLinks: [],
};

describe("applyPrecedence", () => {
  it("prefers og:title over the plain <title>", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, ogTitle: "OG Title", htmlTitle: "HTML Title" },
      "https://example.com/",
    );
    expect(result.title).toBe("OG Title");
  });

  it("falls back to the plain <title> when there's no og:title", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, htmlTitle: "HTML Title" },
      "https://example.com/",
    );
    expect(result.title).toBe("HTML Title");
  });

  it("returns a null title when the page offers neither", () => {
    const result = applyPrecedence(EMPTY_FIELDS, "https://example.com/");
    expect(result.title).toBeNull();
  });

  it("prefers og:description over the meta description", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, ogDescription: "OG desc", metaDescription: "Meta desc" },
      "https://example.com/",
    );
    expect(result.description).toBe("OG desc");
  });

  it("prefers og:image over twitter:image", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, ogImage: "/og.png", twitterImage: "/tw.png" },
      "https://example.com/",
    );
    expect(result.imageUrl).toBe("https://example.com/og.png");
  });

  it("falls back to twitter:image when there's no og:image", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, twitterImage: "/tw.png" },
      "https://example.com/",
    );
    expect(result.imageUrl).toBe("https://example.com/tw.png");
  });

  it("resolves a relative image URL against the final page URL", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, ogImage: "images/cover.png" },
      "https://example.com/blog/post",
    );
    expect(result.imageUrl).toBe("https://example.com/blog/images/cover.png");
  });

  it("leaves imageUrl null when neither og:image nor twitter:image exist", () => {
    const result = applyPrecedence(EMPTY_FIELDS, "https://example.com/");
    expect(result.imageUrl).toBeNull();
  });

  it("prefers a declared icon over apple-touch-icon", () => {
    const result = applyPrecedence(
      {
        ...EMPTY_FIELDS,
        iconLinks: [
          { rel: "apple-touch-icon", href: "/apple.png" },
          { rel: "icon", href: "/icon.png" },
        ],
      },
      "https://example.com/",
    );
    expect(result.faviconUrl).toBe("https://example.com/icon.png");
  });

  it("falls back to apple-touch-icon when there's no icon/shortcut icon", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, iconLinks: [{ rel: "apple-touch-icon", href: "/apple.png" }] },
      "https://example.com/",
    );
    expect(result.faviconUrl).toBe("https://example.com/apple.png");
  });

  it("guesses /favicon.ico at the domain root when no icon is declared at all", () => {
    const result = applyPrecedence(EMPTY_FIELDS, "https://example.com/some/deep/page");
    expect(result.faviconUrl).toBe("https://example.com/favicon.ico");
  });

  it("resolves a relative favicon href against the final page URL", () => {
    const result = applyPrecedence(
      { ...EMPTY_FIELDS, iconLinks: [{ rel: "shortcut icon", href: "favicon-32.png" }] },
      "https://example.com/blog/post",
    );
    expect(result.faviconUrl).toBe("https://example.com/blog/favicon-32.png");
  });
});
