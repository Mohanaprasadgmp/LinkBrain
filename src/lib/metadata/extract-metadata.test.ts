import { describe, expect, it, vi } from "vitest";

import { extractMetadata } from "./extract-metadata";
import * as fetchPageModule from "./fetch-page";

describe("extractMetadata", () => {
  it("returns parsed, precedence-applied metadata on a successful fetch", async () => {
    vi.spyOn(fetchPageModule, "fetchPage").mockResolvedValue({
      ok: true,
      html: `<html><head>
        <title>Fallback Title</title>
        <meta property="og:title" content="Real Title">
        <meta property="og:description" content="Real description.">
        <link rel="icon" href="/icon.png">
      </head></html>`,
      finalUrl: "https://example.com/article",
    });

    const result = await extractMetadata("https://example.com/article");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.title).toBe("Real Title");
      expect(result.metadata.description).toBe("Real description.");
      expect(result.metadata.faviconUrl).toBe("https://example.com/icon.png");
    }
  });

  it("propagates the failure reason when the fetch itself fails", async () => {
    vi.spyOn(fetchPageModule, "fetchPage").mockResolvedValue({
      ok: false,
      reason: "blocked-address",
    });

    const result = await extractMetadata("http://127.0.0.1/");

    expect(result).toEqual({ ok: false, reason: "blocked-address" });
  });

  it("degrades gracefully rather than throwing when the final URL is unusable", async () => {
    vi.spyOn(fetchPageModule, "fetchPage").mockResolvedValue({
      ok: true,
      html: "<html><head><title>Still Works</title></head></html>",
      finalUrl: "not a valid url at all::::",
    });

    // precedence.ts's own try/catch around `new URL()` should leave
    // URL-dependent fields null rather than this throwing all the way up.
    const result = await extractMetadata("https://example.com/");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.title).toBe("Still Works");
      expect(result.metadata.faviconUrl).toBeNull();
    }
  });
});
