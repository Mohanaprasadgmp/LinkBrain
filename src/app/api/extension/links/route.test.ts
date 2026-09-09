import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EXTENSION_ORIGIN } from "@/config/extension";
import { cleanupTestData, createTestUser, testUrl } from "@/lib/data/test-helpers";

/**
 * Exercises `POST /api/extension/links` end to end against a real Postgres
 * database (via `lib/data/test-helpers.ts`, same as
 * `drizzle-link-repository.test.ts`) with only the session boundary mocked —
 * `@/lib/auth/session`'s `getCurrentUser` is the one thing a real HTTP
 * request would resolve via the `bearer` plugin, and Better Auth's own token
 * verification isn't this codebase's code to re-test. Everything below that
 * (ownership, duplicate detection, validation) runs for real.
 */
const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const extractMetadataMock = vi.fn();
vi.mock("@/lib/metadata", () => ({
  extractMetadata: (...args: unknown[]) => extractMetadataMock(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("Extension Links Route");
  otherUserId = await createTestUser("Extension Links Route Other");
});
afterAll(cleanupTestData);

beforeEach(() => {
  extractMetadataMock.mockReset();
  extractMetadataMock.mockResolvedValue({ ok: false, reason: "network-error" });
  getCurrentUserMock.mockReset();
});
afterEach(() => {
  vi.resetModules();
});

function postRequest(body: unknown, origin = EXTENSION_ORIGIN) {
  return new NextRequest("http://localhost:3000/api/extension/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extension/links", () => {
  it("rejects an unauthenticated request with 401", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(postRequest({ url: testUrl("unauth") }));

    expect(response.status).toBe(401);
  });

  it("rejects a malformed JSON body with 400", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");

    const request = new NextRequest("http://localhost:3000/api/extension/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: EXTENSION_ORIGIN },
      body: "not json",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects an invalid status value with 400", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");

    const response = await POST(
      postRequest({ url: testUrl("bad-status"), status: "not-a-real-status" }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an invalid URL with 400", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");

    const response = await POST(postRequest({ url: "javascript:alert(1)" }));

    expect(response.status).toBe(400);
  });

  it("never accepts a client-supplied userId as an authority claim", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");

    const response = await POST(
      postRequest({ url: testUrl("ignore-userid"), userId: otherUserId }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    // The link is owned by the session's user, never the body's `userId`.
    const { getLinkRepository } = await import("@/lib/data");
    const link = await getLinkRepository().forUser(userId).get(body.link.id);
    expect(link).not.toBeNull();
    const foreignLink = await getLinkRepository().forUser(otherUserId).get(body.link.id);
    expect(foreignLink).toBeNull();
  });

  it("creates a link for the authenticated user and attaches CORS headers", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");

    const response = await POST(postRequest({ url: testUrl("create-ok"), title: "Hello" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.link.title).toBe("Hello");
    expect(body.link.detailUrl).toContain(body.link.id);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(EXTENSION_ORIGIN);
  });

  it("does not set CORS headers for a non-extension origin", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");

    const response = await POST(
      postRequest({ url: testUrl("wrong-origin") }, "https://evil.example.com"),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("returns 409 for a URL the same user already saved", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { POST } = await import("./route");
    const url = testUrl("route-duplicate");

    await POST(postRequest({ url }));
    const second = await POST(postRequest({ url }));
    const body = await second.json();

    expect(second.status).toBe(409);
    expect(body.duplicate).toBe(true);
  });

  it("does not flag a duplicate across different users", async () => {
    const url = testUrl("route-cross-user-duplicate");
    const { POST } = await import("./route");

    getCurrentUserMock.mockResolvedValue({ id: userId });
    const mine = await POST(postRequest({ url }));
    expect(mine.status).toBe(201);

    getCurrentUserMock.mockResolvedValue({ id: otherUserId });
    const theirs = await POST(postRequest({ url }));
    expect(theirs.status).toBe(201);
  });
});

describe("OPTIONS /api/extension/links", () => {
  it("answers the CORS preflight for the extension origin", async () => {
    const { OPTIONS } = await import("./route");
    const request = new NextRequest("http://localhost:3000/api/extension/links", {
      method: "OPTIONS",
      headers: { Origin: EXTENSION_ORIGIN },
    });

    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(EXTENSION_ORIGIN);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });
});
