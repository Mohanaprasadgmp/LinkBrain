import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleLinkRepository, getProjectLinkStats } from "./drizzle-link-repository";
import { DrizzleProjectRepository } from "./drizzle-project-repository";
import type { UserScopedLinkRepository, UserScopedProjectRepository } from "./repository";
import { cleanupTestData, createTestUser, TEST_PROJECT_PREFIX, testUrl } from "./test-helpers";

const projectRepo = new DrizzleProjectRepository();
const linkRepo = new DrizzleLinkRepository();

let userId: string;
let scoped: UserScopedProjectRepository;
let scopedLinks: UserScopedLinkRepository;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("Project Repo");
  scoped = projectRepo.forUser(userId);
  scopedLinks = linkRepo.forUser(userId);
});
afterAll(cleanupTestData);

describe("DrizzleProjectRepository", () => {
  it("creates and reads back a project", async () => {
    const created = await scoped.create({
      name: `${TEST_PROJECT_PREFIX}Beta`,
      description: "A test project",
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe(`${TEST_PROJECT_PREFIX}Beta`);
    expect(created.description).toBe("A test project");
    expect(created.accent).toBeTruthy();

    const fetched = await scoped.get(created.id);
    expect(fetched?.name).toBe(`${TEST_PROJECT_PREFIX}Beta`);
  });

  it("updates a project", async () => {
    const created = await scoped.create({ name: `${TEST_PROJECT_PREFIX}Gamma` });

    const updated = await scoped.update(created.id, {
      description: "Now with a description",
    });

    expect(updated?.description).toBe("Now with a description");
    expect(updated?.name).toBe(`${TEST_PROJECT_PREFIX}Gamma`);
  });

  it("deletes a project", async () => {
    const created = await scoped.create({ name: `${TEST_PROJECT_PREFIX}Delta` });

    const deleted = await scoped.delete(created.id);
    expect(deleted).toBe(true);

    const fetched = await scoped.get(created.id);
    expect(fetched).toBeNull();
  });

  it("lists every project", async () => {
    await scoped.create({ name: `${TEST_PROJECT_PREFIX}Epsilon` });

    const all = await scoped.list();
    expect(all.some((project) => project.name === `${TEST_PROJECT_PREFIX}Epsilon`)).toBe(true);
  });

  it("reports a zero link count for a freshly created project", async () => {
    const project = await scoped.create({ name: `${TEST_PROJECT_PREFIX}Zeta` });

    const stats = await getProjectLinkStats(userId);
    expect(stats[project.id]).toBeUndefined();
  });

  it("reports the correct link count and last activity once links are assigned", async () => {
    const project = await scoped.create({ name: `${TEST_PROJECT_PREFIX}Eta` });

    await scopedLinks.create({
      url: testUrl("project-stats-1"),
      title: "Project stats 1",
      projectId: project.id,
    });
    const second = await scopedLinks.create({
      url: testUrl("project-stats-2"),
      title: "Project stats 2",
      projectId: project.id,
    });

    const stats = await getProjectLinkStats(userId);
    expect(stats[project.id]?.count).toBe(2);
    expect(new Date(stats[project.id]!.lastActivity).getTime()).toBeGreaterThanOrEqual(
      new Date(second.updatedAt).getTime(),
    );
  });

  it("deleting a project leaves its links intact with projectId cleared", async () => {
    const project = await scoped.create({ name: `${TEST_PROJECT_PREFIX}Theta` });
    const link = await scopedLinks.create({
      url: testUrl("project-delete-keeps-link"),
      title: "Kept after project deletion",
      projectId: project.id,
    });

    const deleted = await scoped.delete(project.id);
    expect(deleted).toBe(true);

    const stillThere = await scopedLinks.get(link.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere?.title).toBe("Kept after project deletion");
    expect(stillThere?.projectId).toBeNull();
  });

  describe("user scoping", () => {
    it("get/update/delete never affect another user's project", async () => {
      const otherUserId = await createTestUser("Project Repo Other");
      const other = projectRepo.forUser(otherUserId);
      const theirs = await other.create({ name: `${TEST_PROJECT_PREFIX}TheirsOnly` });

      expect(await scoped.get(theirs.id)).toBeNull();
      expect(await scoped.update(theirs.id, { name: "Hijacked" })).toBeNull();
      expect(await scoped.delete(theirs.id)).toBe(false);

      const stillTheirs = await other.get(theirs.id);
      expect(stillTheirs?.name).toBe(`${TEST_PROJECT_PREFIX}TheirsOnly`);
    });

    it("list only returns this user's own projects", async () => {
      const otherUserId = await createTestUser("Project Repo Other 2");
      const other = projectRepo.forUser(otherUserId);
      await other.create({ name: `${TEST_PROJECT_PREFIX}NotMine` });

      const mine = await scoped.list();
      expect(mine.some((project) => project.name === `${TEST_PROJECT_PREFIX}NotMine`)).toBe(false);
    });

    it("creating or updating a link with another user's projectId leaves it unfiled, not cross-assigned", async () => {
      const otherUserId = await createTestUser("Project Repo Other 3");
      const other = projectRepo.forUser(otherUserId);
      const theirProject = await other.create({ name: `${TEST_PROJECT_PREFIX}CrossAssign` });

      const created = await scopedLinks.create({
        url: testUrl("cross-assign-link"),
        title: "Cross-assign attempt",
        projectId: theirProject.id,
      });
      expect(created.projectId).toBeNull();

      const other2 = await scopedLinks.create({
        url: testUrl("cross-assign-link-2"),
        title: "Cross-assign attempt 2",
      });
      const updated = await scopedLinks.update(other2.id, { projectId: theirProject.id });
      expect(updated?.projectId).toBeNull();
    });
  });
});
