import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { EXTENSION_ORIGINS } from "@/config/extension";

import { extensionPreflight, withExtensionCors } from "./cors";

/**
 * `EXTENSION_ORIGINS` is a list (Phase 6B) rather than a single value, so
 * the Chrome Web Store id can be added later without touching `cors.ts` —
 * these tests exercise that list-based matching directly, independent of
 * any one route. Never `*`, never a reflected arbitrary origin.
 */
function requestWithOrigin(origin: string | null) {
  return new NextRequest("http://localhost:3000/api/extension/links", {
    headers: origin ? { Origin: origin } : {},
  });
}

describe("withExtensionCors", () => {
  it("attaches CORS headers for every origin in the allow-list", () => {
    for (const origin of EXTENSION_ORIGINS) {
      const response = withExtensionCors(requestWithOrigin(origin), NextResponse.json({}));
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    }
  });

  it("does not attach CORS headers for an unlisted origin", () => {
    const response = withExtensionCors(
      requestWithOrigin("chrome-extension://not-our-extension"),
      NextResponse.json({}),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("does not attach CORS headers for a normal web origin", () => {
    const response = withExtensionCors(
      requestWithOrigin("https://evil.example.com"),
      NextResponse.json({}),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("does not attach CORS headers when no Origin header is present", () => {
    const response = withExtensionCors(requestWithOrigin(null), NextResponse.json({}));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("never sets a wildcard origin", () => {
    const response = withExtensionCors(requestWithOrigin(EXTENSION_ORIGINS[0]), NextResponse.json({}));
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });
});

describe("extensionPreflight", () => {
  it("answers a valid-origin preflight with 204 and the expected headers", () => {
    const response = extensionPreflight(requestWithOrigin(EXTENSION_ORIGINS[0]));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(EXTENSION_ORIGINS[0]);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("answers an invalid-origin preflight with 204 but no CORS headers", () => {
    const response = extensionPreflight(requestWithOrigin("https://evil.example.com"));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
