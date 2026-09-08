import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleProjectRepository } from "./drizzle-project-repository";
import { cleanupTestData, TEST_PROJECT_PREFIX } from "./test-helpers";

const projectRepo = new DrizzleProjectRepository();

beforeAll(cleanupTestData);
afterAll(cleanupTestData);

describe("DrizzleProjectRepository", () => {
  it("creates and reads back a project", async () => {
    const created = await projectRepo.create({
      name: `${TEST_PROJECT_PREFIX}Beta`,
      description: "A test project",
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe(`${TEST_PROJECT_PREFIX}Beta`);
    expect(created.description).toBe("A test project");
    expect(created.accent).toBeTruthy();

    const fetched = await projectRepo.get(created.id);
    expect(fetched?.name).toBe(`${TEST_PROJECT_PREFIX}Beta`);
  });

  it("updates a project", async () => {
    const created = await projectRepo.create({ name: `${TEST_PROJECT_PREFIX}Gamma` });

    const updated = await projectRepo.update(created.id, {
      description: "Now with a description",
    });

    expect(updated?.description).toBe("Now with a description");
    expect(updated?.name).toBe(`${TEST_PROJECT_PREFIX}Gamma`);
  });

  it("deletes a project", async () => {
    const created = await projectRepo.create({ name: `${TEST_PROJECT_PREFIX}Delta` });

    const deleted = await projectRepo.delete(created.id);
    expect(deleted).toBe(true);

    const fetched = await projectRepo.get(created.id);
    expect(fetched).toBeNull();
  });

  it("lists every project", async () => {
    await projectRepo.create({ name: `${TEST_PROJECT_PREFIX}Epsilon` });

    const all = await projectRepo.list();
    expect(all.some((project) => project.name === `${TEST_PROJECT_PREFIX}Epsilon`)).toBe(true);
  });
});
