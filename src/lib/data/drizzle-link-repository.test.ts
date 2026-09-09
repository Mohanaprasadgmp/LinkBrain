import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { links as linksTable } from "@/lib/db/schema";

import { DrizzleLinkRepository } from "./drizzle-link-repository";
import { DrizzleProjectRepository } from "./drizzle-project-repository";
import type { UserScopedLinkRepository, UserScopedProjectRepository } from "./repository";
import { cleanupTestData, createTestUser, testUrl } from "./test-helpers";

/**
 * These tests hit a real Postgres database via `DATABASE_URL` — there is no
 * in-memory substitute that exercises real joins/transactions for project
 * relationships. Point `DATABASE_URL` (in `.env.local`) at a scratch
 * database or a dedicated Neon branch before running `npm test`; every row
 * these tests create is scoped under `TEST_URL_PREFIX`/`TEST_PROJECT_PREFIX`/
 * a `TEST_USER_EMAIL_PREFIX` test user and removed in `afterAll`.
 *
 * Every test in the main `describe` block below shares one test user
 * (`scoped`/`scopedProjects`, both `.forUser(userId)`) — none of them are
 * *about* user scoping, so sharing one user keeps them exactly as readable
 * as before this phase. Cross-user isolation gets its own dedicated
 * `describe("user scoping")` block at the end, with a second user.
 */

const linkRepo = new DrizzleLinkRepository();
const projectRepo = new DrizzleProjectRepository();

let userId: string;
let scoped: UserScopedLinkRepository;
let scopedProjects: UserScopedProjectRepository;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("Link Repo");
  scoped = linkRepo.forUser(userId);
  scopedProjects = projectRepo.forUser(userId);
});
afterAll(cleanupTestData);

describe("DrizzleLinkRepository", () => {
  it("creates a link, deriving domain and falling back the title from the URL", async () => {
    const link = await scoped.create({
      url: testUrl("create-basic/some-article"),
      title: "",
    });

    expect(link.id).toBeTruthy();
    expect(link.domain).toBe("test.linkbrain.internal");
    expect(link.title).toBe("Some article");
    expect(link.status).toBe("saved");
    expect(link.priority).toBe("useful");
    expect(link.isFavorite).toBe(false);
  });

  it("reads a created link back by id", async () => {
    const created = await scoped.create({
      url: testUrl("get-by-id"),
      title: "Gettable link",
    });

    const fetched = await scoped.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Gettable link");
  });

  it("returns null for a link that doesn't exist", async () => {
    const fetched = await scoped.get("00000000-0000-0000-0000-000000000000");
    expect(fetched).toBeNull();
  });

  it("updates title, description, note and favorite together", async () => {
    const created = await scoped.create({ url: testUrl("update-fields"), title: "Original" });

    const updated = await scoped.update(created.id, {
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
    const created = await scoped.create({ url: testUrl("favorite"), title: "Fav test" });
    expect(created.isFavorite).toBe(false);

    const favorited = await scoped.update(created.id, { isFavorite: true });
    expect(favorited?.isFavorite).toBe(true);

    const unfavorited = await scoped.update(created.id, { isFavorite: false });
    expect(unfavorited?.isFavorite).toBe(false);
  });

  it("updates status and priority independently", async () => {
    const created = await scoped.create({ url: testUrl("status-priority"), title: "S/P test" });

    const readStatus = await scoped.update(created.id, { status: "reading" });
    expect(readStatus?.status).toBe("reading");
    expect(readStatus?.priority).toBe("useful");

    const mustRead = await scoped.update(created.id, { priority: "must-read" });
    expect(mustRead?.status).toBe("reading");
    expect(mustRead?.priority).toBe("must-read");
  });

  it("sets archivedAt when status becomes archived, and clears it when status moves away", async () => {
    const created = await scoped.create({ url: testUrl("archive"), title: "Archive test" });

    await scoped.update(created.id, { status: "archived" });
    const [archivedRow] = await getDb()
      .select({ archivedAt: linksTable.archivedAt, status: linksTable.status })
      .from(linksTable)
      .where(eq(linksTable.id, created.id));
    expect(archivedRow.status).toBe("archived");
    expect(archivedRow.archivedAt).not.toBeNull();

    await scoped.update(created.id, { status: "read" });
    const [restoredRow] = await getDb()
      .select({ archivedAt: linksTable.archivedAt, status: linksTable.status })
      .from(linksTable)
      .where(eq(linksTable.id, created.id));
    expect(restoredRow.status).toBe("read");
    expect(restoredRow.archivedAt).toBeNull();
  });

  it("deletes a link", async () => {
    const created = await scoped.create({ url: testUrl("delete-me"), title: "Delete test" });

    const deleted = await scoped.delete(created.id);
    expect(deleted).toBe(true);

    const fetched = await scoped.get(created.id);
    expect(fetched).toBeNull();

    const deletedAgain = await scoped.delete(created.id);
    expect(deletedAgain).toBe(false);
  });

  it("associates a link with a project, and un-assigns it when the project is deleted", async () => {
    const project = await scopedProjects.create({ name: "Test Project Alpha" });
    const created = await scoped.create({
      url: testUrl("project-link"),
      title: "Project-scoped link",
      projectId: project.id,
    });

    expect(created.projectId).toBe(project.id);

    await scopedProjects.delete(project.id);

    const afterProjectDeleted = await scoped.get(created.id);
    expect(afterProjectDeleted?.projectId).toBeNull();
  });

  it("filters by status, priority and favorite", async () => {
    await scoped.create({
      url: testUrl("filter-status"),
      title: "Filter status",
      status: "reading",
      priority: "must-read",
      isFavorite: true,
    });

    const byStatus = await scoped.list({ status: ["reading"] });
    expect(byStatus.some((link) => link.url === testUrl("filter-status"))).toBe(true);

    const byPriority = await scoped.list({ priority: ["must-read"] });
    expect(byPriority.some((link) => link.url === testUrl("filter-status"))).toBe(true);

    const byFavorite = await scoped.list({ isFavorite: true });
    expect(byFavorite.some((link) => link.url === testUrl("filter-status"))).toBe(true);
  });

  it("finds links via free-text search across title, description and domain", async () => {
    await scoped.create({
      url: testUrl("search-target"),
      title: "Zephyr Widget Documentation",
      description: "A rare word: kumquat",
    });

    const byTitle = await scoped.list({ query: "Zephyr Widget" });
    expect(byTitle.some((link) => link.url === testUrl("search-target"))).toBe(true);

    const byDescription = await scoped.list({ query: "kumquat" });
    expect(byDescription.some((link) => link.url === testUrl("search-target"))).toBe(true);

    const noMatch = await scoped.list({ query: "nonexistent-search-term-xyz" });
    expect(noMatch.some((link) => link.url === testUrl("search-target"))).toBe(false);
  });

  it("combines status, priority and project filters together (AND across all three)", async () => {
    const project = await scopedProjects.create({ name: "Test Project Combined" });

    const matching = await scoped.create({
      url: testUrl("combined-match"),
      title: "Combined match",
      status: "reading",
      priority: "must-read",
      projectId: project.id,
    });

    // Each of these differs from `matching` in exactly one dimension, so a
    // correct AND-across-everything filter must exclude all of them.
    await scoped.create({
      url: testUrl("combined-wrong-status"),
      title: "Wrong status",
      status: "saved",
      priority: "must-read",
      projectId: project.id,
    });
    await scoped.create({
      url: testUrl("combined-wrong-project"),
      title: "Wrong project",
      status: "reading",
      priority: "must-read",
    });

    const results = await scoped.list({
      status: ["reading"],
      priority: ["must-read"],
      projectId: project.id,
    });

    expect(results.map((link) => link.id)).toEqual([matching.id]);
  });

  describe("pagination and count", () => {
    it("limits, offsets and reports a total independent of the page size", async () => {
      const urls = ["page-a", "page-b", "page-c"].map((slug) => testUrl(`paginate-${slug}`));
      for (const url of urls) {
        await scoped.create({ url, title: "Pagination test link" });
      }

      const filter = { query: "Pagination test link" };
      const total = await scoped.count(filter);
      expect(total).toBe(3);

      const firstPage = await scoped.list(filter, { sort: "oldest", limit: 2, offset: 0 });
      const secondPage = await scoped.list(filter, { sort: "oldest", limit: 2, offset: 2 });

      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(1);
      expect(firstPage.map((link) => link.url)).toEqual(urls.slice(0, 2));
      expect(secondPage.map((link) => link.url)).toEqual(urls.slice(2));
    });
  });

  describe("sort orders", () => {
    it("orders oldest/newest by creation time", async () => {
      const first = await scoped.create({ url: testUrl("sort-oldest-1"), title: "Sort A" });
      const second = await scoped.create({ url: testUrl("sort-oldest-2"), title: "Sort B" });

      const filter = { query: "Sort" };
      const oldest = await scoped.list(filter, { sort: "oldest" });
      const newest = await scoped.list(filter, { sort: "newest" });

      expect(oldest.map((link) => link.id)).toEqual([first.id, second.id]);
      expect(newest.map((link) => link.id)).toEqual([second.id, first.id]);
    });

    it("orders by most recently updated", async () => {
      const first = await scoped.create({ url: testUrl("sort-updated-1"), title: "Recency sort A" });
      const second = await scoped.create({ url: testUrl("sort-updated-2"), title: "Recency sort B" });

      await scoped.update(first.id, { description: "touched" });

      const results = await scoped.list({ query: "Recency sort" }, { sort: "recently-updated" });
      expect(results.map((link) => link.id)).toEqual([first.id, second.id]);
    });

    it("orders title A-Z and Z-A", async () => {
      await scoped.create({ url: testUrl("sort-title-1"), title: "Zebra sort title" });
      await scoped.create({ url: testUrl("sort-title-2"), title: "Apple sort title" });

      const ascending = await scoped.list({ query: "sort title" }, { sort: "title" });
      const descending = await scoped.list({ query: "sort title" }, { sort: "title-desc" });

      expect(ascending.map((link) => link.title)).toEqual([
        "Apple sort title",
        "Zebra sort title",
      ]);
      expect(descending.map((link) => link.title)).toEqual([
        "Zebra sort title",
        "Apple sort title",
      ]);
    });

    it("orders by priority weight, newest first within a tie", async () => {
      await scoped.create({
        url: testUrl("sort-priority-1"),
        title: "Priority sort reference",
        priority: "reference",
      });
      await scoped.create({
        url: testUrl("sort-priority-2"),
        title: "Priority sort must-read",
        priority: "must-read",
      });
      await scoped.create({
        url: testUrl("sort-priority-3"),
        title: "Priority sort useful",
        priority: "useful",
      });

      const results = await scoped.list({ query: "Priority sort" }, { sort: "priority" });
      expect(results.map((link) => link.priority)).toEqual(["must-read", "useful", "reference"]);
    });
  });

  describe("bulkApply", () => {
    it("updates status (and archivedAt consistency) across every selected id", async () => {
      const a = await scoped.create({ url: testUrl("bulk-status-a"), title: "Bulk status A" });
      const b = await scoped.create({ url: testUrl("bulk-status-b"), title: "Bulk status B" });

      const affected = await scoped.bulkApply([a.id, b.id], { type: "status", status: "read" });
      expect(affected).toBe(2);

      const refreshedA = await scoped.get(a.id);
      const refreshedB = await scoped.get(b.id);
      expect(refreshedA?.status).toBe("read");
      expect(refreshedB?.status).toBe("read");

      const archived = await scoped.bulkApply([a.id], { type: "archive" });
      expect(archived).toBe(1);
      const [archivedRow] = await getDb()
        .select({ archivedAt: linksTable.archivedAt })
        .from(linksTable)
        .where(eq(linksTable.id, a.id));
      expect(archivedRow.archivedAt).not.toBeNull();
    });

    it("updates priority, project and favorite across every selected id", async () => {
      const project = await scopedProjects.create({ name: "Test Project Bulk" });
      const a = await scoped.create({ url: testUrl("bulk-fields-a"), title: "Bulk fields A" });
      const b = await scoped.create({ url: testUrl("bulk-fields-b"), title: "Bulk fields B" });
      const ids = [a.id, b.id];

      await scoped.bulkApply(ids, { type: "priority", priority: "must-read" });
      await scoped.bulkApply(ids, { type: "project", projectId: project.id });
      await scoped.bulkApply(ids, { type: "favorite", value: true });

      for (const id of ids) {
        const updated = await scoped.get(id);
        expect(updated?.priority).toBe("must-read");
        expect(updated?.projectId).toBe(project.id);
        expect(updated?.isFavorite).toBe(true);
      }
    });

    it("deletes every selected id and reports how many were actually removed", async () => {
      const a = await scoped.create({ url: testUrl("bulk-delete-a"), title: "Bulk delete A" });
      const b = await scoped.create({ url: testUrl("bulk-delete-b"), title: "Bulk delete B" });

      const deleted = await scoped.bulkApply(
        [a.id, b.id, "00000000-0000-0000-0000-000000000000"],
        { type: "delete" },
      );

      expect(deleted).toBe(2);
      expect(await scoped.get(a.id)).toBeNull();
      expect(await scoped.get(b.id)).toBeNull();
    });
  });

  describe("user scoping", () => {
    it("list/count never include another user's links", async () => {
      const otherUserId = await createTestUser("Link Repo Other A");
      const other = linkRepo.forUser(otherUserId);
      await other.create({ url: testUrl("scoping-other-list"), title: "Other user's link" });

      const mine = await scoped.list({ query: "Other user's link" });
      expect(mine).toHaveLength(0);
      expect(await scoped.count({ query: "Other user's link" })).toBe(0);
    });

    it("get returns null for another user's link (indistinguishable from not existing)", async () => {
      const otherUserId = await createTestUser("Link Repo Other B");
      const other = linkRepo.forUser(otherUserId);
      const theirs = await other.create({ url: testUrl("scoping-other-get"), title: "Theirs" });

      expect(await scoped.get(theirs.id)).toBeNull();
    });

    it("findByUrl doesn't find another user's link, even with the exact same URL", async () => {
      const otherUserId = await createTestUser("Link Repo Other C");
      const other = linkRepo.forUser(otherUserId);
      const url = testUrl("scoping-shared-url");
      await other.create({ url, title: "Theirs" });

      expect(await scoped.findByUrl(url)).toBeNull();

      // The same URL is still saveable by a different user — not a duplicate for them.
      const mine = await scoped.create({ url, title: "Mine" });
      expect(mine.url).toBe(url);
    });

    it("update does not modify another user's link", async () => {
      const otherUserId = await createTestUser("Link Repo Other D");
      const other = linkRepo.forUser(otherUserId);
      const theirs = await other.create({ url: testUrl("scoping-other-update"), title: "Original" });

      const result = await scoped.update(theirs.id, { title: "Hijacked" });
      expect(result).toBeNull();

      const stillTheirs = await other.get(theirs.id);
      expect(stillTheirs?.title).toBe("Original");
    });

    it("delete does not remove another user's link", async () => {
      const otherUserId = await createTestUser("Link Repo Other F");
      const other = linkRepo.forUser(otherUserId);
      const theirs = await other.create({ url: testUrl("scoping-other-delete"), title: "Theirs" });

      const deleted = await scoped.delete(theirs.id);
      expect(deleted).toBe(false);
      expect(await other.get(theirs.id)).not.toBeNull();
    });

    it("bulkApply silently skips ids belonging to another user", async () => {
      const otherUserId = await createTestUser("Link Repo Other G");
      const other = linkRepo.forUser(otherUserId);
      const theirs = await other.create({ url: testUrl("scoping-other-bulk"), title: "Theirs" });
      const mine = await scoped.create({ url: testUrl("scoping-mine-bulk"), title: "Mine" });

      const affected = await scoped.bulkApply([theirs.id, mine.id], {
        type: "status",
        status: "read",
      });

      // Only `mine` should have been touched.
      expect(affected).toBe(1);
      expect((await other.get(theirs.id))?.status).toBe("saved");
      expect((await scoped.get(mine.id))?.status).toBe("read");
    });

    it("create and bulkApply's project action cannot assign a link to another user's project", async () => {
      const otherUserId = await createTestUser("Link Repo Other I");
      const otherProjects = projectRepo.forUser(otherUserId);
      const theirProject = await otherProjects.create({ name: "Their project" });

      const created = await scoped.create({
        url: testUrl("scoping-cross-project-create"),
        title: "Cross-project create",
        projectId: theirProject.id,
      });
      expect(created.projectId).toBeNull();

      const mine = await scoped.create({ url: testUrl("scoping-cross-project-bulk"), title: "Mine" });
      await scoped.bulkApply([mine.id], { type: "project", projectId: theirProject.id });
      expect((await scoped.get(mine.id))?.projectId).toBeNull();
    });
  });
});
