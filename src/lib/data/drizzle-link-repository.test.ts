import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { links as linksTable, tags as tagsTable } from "@/lib/db/schema";

import { DrizzleLinkRepository } from "./drizzle-link-repository";
import { DrizzleProjectRepository } from "./drizzle-project-repository";
import { cleanupTestData, testUrl } from "./test-helpers";

/**
 * These tests hit a real Postgres database via `DATABASE_URL` — there is no
 * in-memory substitute that exercises real joins/transactions for tag and
 * project relationships. Point `DATABASE_URL` (in `.env.local`) at a scratch
 * database or a dedicated Neon branch before running `npm test`; every row
 * these tests create is scoped under `TEST_URL_PREFIX`/`TEST_TAG_PREFIX`/
 * `TEST_PROJECT_PREFIX` and removed in `afterAll`.
 */

const linkRepo = new DrizzleLinkRepository();
const projectRepo = new DrizzleProjectRepository();

beforeAll(cleanupTestData);
afterAll(cleanupTestData);

describe("DrizzleLinkRepository", () => {
  it("creates a link, deriving domain and falling back the title from the URL", async () => {
    const link = await linkRepo.create({
      url: testUrl("create-basic/some-article"),
      title: "",
    });

    expect(link.id).toBeTruthy();
    expect(link.domain).toBe("test.linkbrain.internal");
    expect(link.title).toBe("Some article");
    expect(link.status).toBe("saved");
    expect(link.priority).toBe("useful");
    expect(link.isFavorite).toBe(false);
    expect(link.tags).toEqual([]);
  });

  it("reads a created link back by id", async () => {
    const created = await linkRepo.create({
      url: testUrl("get-by-id"),
      title: "Gettable link",
    });

    const fetched = await linkRepo.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Gettable link");
  });

  it("returns null for a link that doesn't exist", async () => {
    const fetched = await linkRepo.get("00000000-0000-0000-0000-000000000000");
    expect(fetched).toBeNull();
  });

  it("updates title, description, note and favorite together", async () => {
    const created = await linkRepo.create({ url: testUrl("update-fields"), title: "Original" });

    const updated = await linkRepo.update(created.id, {
      title: "Updated title",
      description: "Updated description",
      note: "A note to self",
      isFavorite: true,
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Updated title");
    expect(updated?.description).toBe("Updated description");
    expect(updated?.note).toBe("A note to self");
    expect(updated?.isFavorite).toBe(true);
  });

  it("toggles favorite via update", async () => {
    const created = await linkRepo.create({ url: testUrl("favorite"), title: "Fav test" });
    expect(created.isFavorite).toBe(false);

    const favorited = await linkRepo.update(created.id, { isFavorite: true });
    expect(favorited?.isFavorite).toBe(true);

    const unfavorited = await linkRepo.update(created.id, { isFavorite: false });
    expect(unfavorited?.isFavorite).toBe(false);
  });

  it("updates status and priority independently", async () => {
    const created = await linkRepo.create({ url: testUrl("status-priority"), title: "S/P test" });

    const readStatus = await linkRepo.update(created.id, { status: "reading" });
    expect(readStatus?.status).toBe("reading");
    expect(readStatus?.priority).toBe("useful");

    const mustRead = await linkRepo.update(created.id, { priority: "must-read" });
    expect(mustRead?.status).toBe("reading");
    expect(mustRead?.priority).toBe("must-read");
  });

  it("sets archivedAt when status becomes archived, and clears it when status moves away", async () => {
    const created = await linkRepo.create({ url: testUrl("archive"), title: "Archive test" });

    await linkRepo.update(created.id, { status: "archived" });
    const [archivedRow] = await getDb()
      .select({ archivedAt: linksTable.archivedAt, status: linksTable.status })
      .from(linksTable)
      .where(eq(linksTable.id, created.id));
    expect(archivedRow.status).toBe("archived");
    expect(archivedRow.archivedAt).not.toBeNull();

    await linkRepo.update(created.id, { status: "read" });
    const [restoredRow] = await getDb()
      .select({ archivedAt: linksTable.archivedAt, status: linksTable.status })
      .from(linksTable)
      .where(eq(linksTable.id, created.id));
    expect(restoredRow.status).toBe("read");
    expect(restoredRow.archivedAt).toBeNull();
  });

  it("deletes a link", async () => {
    const created = await linkRepo.create({ url: testUrl("delete-me"), title: "Delete test" });

    const deleted = await linkRepo.delete(created.id);
    expect(deleted).toBe(true);

    const fetched = await linkRepo.get(created.id);
    expect(fetched).toBeNull();

    const deletedAgain = await linkRepo.delete(created.id);
    expect(deletedAgain).toBe(false);
  });

  it("assigns tags on create and returns them on read", async () => {
    const created = await linkRepo.create({
      url: testUrl("tags-create"),
      title: "Tagged link",
      tags: ["Test-Tag-One", "Test-Tag-Two"],
    });

    expect(created.tags.sort()).toEqual(["Test-Tag-One", "Test-Tag-Two"].sort());
  });

  it("reuses an existing tag rather than creating a duplicate row", async () => {
    const first = await linkRepo.create({
      url: testUrl("tags-reuse-1"),
      title: "First",
      tags: ["Test-Tag-Shared"],
    });
    const second = await linkRepo.create({
      url: testUrl("tags-reuse-2"),
      title: "Second",
      // Different casing — should still resolve to the same tag row.
      tags: ["test-tag-shared"],
    });

    const rows = await getDb()
      .select()
      .from(tagsTable)
      .where(eq(tagsTable.slug, "test-tag-shared"));

    expect(rows).toHaveLength(1);
    // First-seen spelling wins as the display label — the second link reads
    // back "Test-Tag-Shared" even though it was created with "test-tag-shared".
    expect(rows[0].name).toBe("Test-Tag-Shared");
    expect(first.tags).toEqual(["Test-Tag-Shared"]);
    expect(second.tags).toEqual(["Test-Tag-Shared"]);
  });

  it("replaces a link's tags on update rather than merging with the old set", async () => {
    const created = await linkRepo.create({
      url: testUrl("tags-replace"),
      title: "Replace tags",
      tags: ["Test-Tag-Old"],
    });

    const updated = await linkRepo.update(created.id, { tags: ["Test-Tag-New"] });

    expect(updated?.tags).toEqual(["Test-Tag-New"]);
  });

  it("associates a link with a project, and un-assigns it when the project is deleted", async () => {
    const project = await projectRepo.create({ name: "Test Project Alpha" });
    const created = await linkRepo.create({
      url: testUrl("project-link"),
      title: "Project-scoped link",
      projectId: project.id,
    });

    expect(created.projectId).toBe(project.id);

    await projectRepo.delete(project.id);

    const afterProjectDeleted = await linkRepo.get(created.id);
    expect(afterProjectDeleted?.projectId).toBeNull();
  });

  it("filters by status, priority and favorite", async () => {
    await linkRepo.create({
      url: testUrl("filter-status"),
      title: "Filter status",
      status: "reading",
      priority: "must-read",
      isFavorite: true,
    });

    const byStatus = await linkRepo.list({ status: ["reading"] });
    expect(byStatus.some((link) => link.url === testUrl("filter-status"))).toBe(true);

    const byPriority = await linkRepo.list({ priority: ["must-read"] });
    expect(byPriority.some((link) => link.url === testUrl("filter-status"))).toBe(true);

    const byFavorite = await linkRepo.list({ isFavorite: true });
    expect(byFavorite.some((link) => link.url === testUrl("filter-status"))).toBe(true);
  });

  it("finds links via free-text search across title, description and domain", async () => {
    await linkRepo.create({
      url: testUrl("search-target"),
      title: "Zephyr Widget Documentation",
      description: "A rare word: kumquat",
    });

    const byTitle = await linkRepo.list({ query: "Zephyr Widget" });
    expect(byTitle.some((link) => link.url === testUrl("search-target"))).toBe(true);

    const byDescription = await linkRepo.list({ query: "kumquat" });
    expect(byDescription.some((link) => link.url === testUrl("search-target"))).toBe(true);

    const noMatch = await linkRepo.list({ query: "nonexistent-search-term-xyz" });
    expect(noMatch.some((link) => link.url === testUrl("search-target"))).toBe(false);
  });

  it("finds links via free-text search matching a tag name", async () => {
    await linkRepo.create({
      url: testUrl("search-by-tag"),
      title: "Untitled for tag search",
      tags: ["Test-Tag-Searchable"],
    });

    const results = await linkRepo.list({ query: "Searchable" });
    expect(results.some((link) => link.url === testUrl("search-by-tag"))).toBe(true);
  });
});
