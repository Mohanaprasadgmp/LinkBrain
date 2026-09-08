import { describe, expect, it } from "vitest";

import { extractDomain, isValidUrl, normalizeUrl, titleFromUrl } from "./url";

/**
 * Pure functions, no database needed — this covers the "validation" part of
 * Step 15's list, since URL validity is what `createLink`/`updateLink`
 * check before ever touching the repository.
 */

describe("isValidUrl", () => {
  it("accepts a well-formed https URL", () => {
    expect(isValidUrl("https://example.com/article")).toBe(true);
  });

  it("accepts a URL typed without a protocol", () => {
    expect(isValidUrl("example.com/article")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejects a string with no domain", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });
});

describe("extractDomain", () => {
  it("strips protocol and www", () => {
    expect(extractDomain("https://www.example.com/path")).toBe("example.com");
  });
});

describe("normalizeUrl", () => {
  it("adds https:// to a protocol-less URL", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });

  it("returns null for unparseable input", () => {
    expect(normalizeUrl("")).toBeNull();
  });
});

describe("titleFromUrl", () => {
  it("derives a readable title from the last path segment", () => {
    expect(titleFromUrl("https://example.com/some-great-article")).toBe(
      "Some great article",
    );
  });

  it("falls back to the domain when there is no path", () => {
    expect(titleFromUrl("https://example.com")).toBe("example.com");
  });
});
