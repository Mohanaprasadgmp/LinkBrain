import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanupTestData,
  createTestUser,
  testUrl,
} from "@/lib/data/test-helpers";

/**
 * `createLinkForUser` is the one authoritative "save a link" implementation
 * shared by `lib/actions/links.ts`'s `createLink` Server Action and
 * `app/api/extension/links/route.ts` — see `docs/ARCHITECTURE.md`'s "Chrome
 * extension" section. These tests hit a real Postgres database via
 * `DATABASE_URL`, same as `drizzle-link-repository.test.ts`, since duplicate
 * detection and project-ownership resolution are properties of the real
 * repository layer, not something worth re-mocking here.
 *
 * `extractMetadata` is mocked: real network fetches would be slow and flaky
 * in a test run, and metadata precedence itself already has its own
 * dedicated test suite (`lib/metadata/precedence.test.ts`).
 */
const extractMetadataMock = vi.fn();
vi.mock("@/lib/metadata", () => ({
  extractMetadata: (...args: unknown[]) => extractMetadataMock(...args),
}));

/**
 * `revalidatePath` requires a real Next.js request's static-generation store
 * (`node_modules/next`'s own invariant) that doesn't exist outside an actual
 * request — mocked here for the same reason `session.test.ts` mocks
 * `next/headers`/`next/navigation`.
 */
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("Link Service");
  otherUserId = await createTestUser("Link Service Other");
});
afterAll(cleanupTestData);

beforeEach(() => {
  extractMetadataMock.mockReset();
  extractMetadataMock.mockResolvedValue({ ok: false, reason: "network-error" });
});

describe("createLinkForUser", () => {
  it("rejects an invalid URL without touching the database", async () => {
    const { createLinkForUser } = await import("./link-service");

    const result = await createLinkForUser(userId, { url: "not a url", title: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid URL/i);
  });

  it("rejects an oversized field", async () => {
    const { createLinkForUser } = await import("./link-service");

    const result = await createLinkForUser(userId, {
      url: testUrl("oversized"),
      title: "x".repeat(400),
    });

    expect(result.ok).toBe(false);
  });

  it("creates a link and applies metadata enrichment to blank fields only", async () => {
    const { createLinkForUser } = await import("./link-service");
    extractMetadataMock.mockResolvedValue({
      ok: true,
      metadata: {
        title: "Fetched Title",
        description: "Fetched description",
        imageUrl: null,
        faviconUrl: "https://test.linkbrain.internal/favicon.ico",
      },
    });

    const result = await createLinkForUser(userId, {
      url: testUrl("enrichment"),
      title: "",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadataApplied).toBe(true);
      expect(result.link.title).toBe("Fetched Title");
      expect(result.link.favicon).toBe("https://test.linkbrain.internal/favicon.ico");
    }
  });

  it("does not overwrite a user-provided title with fetched metadata", async () => {
    const { createLinkForUser } = await import("./link-service");
    extractMetadataMock.mockResolvedValue({
      ok: true,
      metadata: {
        title: "Fetched Title",
        description: null,
        imageUrl: null,
        faviconUrl: null,
      },
    });

    const result = await createLinkForUser(userId, {
      url: testUrl("keep-user-title"),
      title: "My own title",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.title).toBe("My own title");
  });

  it("rejects a duplicate URL for the same user, carrying the existing link", async () => {
    const { createLinkForUser } = await import("./link-service");
    const url = testUrl("duplicate");

    const first = await createLinkForUser(userId, { url, title: "First save" });
    expect(first.ok).toBe(true);

    const second = await createLinkForUser(userId, { url, title: "Second save" });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.duplicate).toBe(true);
      expect(second.existingLink?.title).toBe("First save");
    }
  });

  it("does not flag a duplicate across different users saving the same URL", async () => {
    const { createLinkForUser } = await import("./link-service");
    const url = testUrl("cross-user-duplicate");

    const mine = await createLinkForUser(userId, { url, title: "Mine" });
    const theirs = await createLinkForUser(otherUserId, { url, title: "Theirs" });

    expect(mine.ok).toBe(true);
    expect(theirs.ok).toBe(true);
  });

  it("force-saves past a duplicate when options.force is set", async () => {
    const { createLinkForUser } = await import("./link-service");
    const url = testUrl("force-duplicate");

    await createLinkForUser(userId, { url, title: "First" });
    const forced = await createLinkForUser(userId, { url, title: "Forced" }, { force: true });

    expect(forced.ok).toBe(true);
  });

  it("silently drops a projectId that belongs to another user", async () => {
    const { createLinkForUser } = await import("./link-service");
    const { getProjectRepository } = await import("@/lib/data");

    const foreignProject = await getProjectRepository().forUser(otherUserId).create({
      name: "Test Project Foreign",
    });

    const result = await createLinkForUser(userId, {
      url: testUrl("foreign-project"),
      title: "Owned by me",
      projectId: foreignProject.id,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.projectId).toBeNull();
  });
});
