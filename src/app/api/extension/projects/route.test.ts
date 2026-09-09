import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EXTENSION_ORIGIN } from "@/config/extension";
import { getProjectRepository } from "@/lib/data";
import { cleanupTestData, createTestUser } from "@/lib/data/test-helpers";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("Extension Projects Route");
  otherUserId = await createTestUser("Extension Projects Route Other");

  await getProjectRepository().forUser(userId).create({ name: "Test Project Mine" });
  await getProjectRepository().forUser(otherUserId).create({ name: "Test Project Theirs" });
});
afterAll(cleanupTestData);

beforeEach(() => {
  getCurrentUserMock.mockReset();
});

function getRequest(origin = EXTENSION_ORIGIN) {
  return new NextRequest("http://localhost:3000/api/extension/projects", {
    headers: { Origin: origin },
  });
}

describe("GET /api/extension/projects", () => {
  it("rejects an unauthenticated request with 401", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
  });

  it("returns only the authenticated user's own projects", async () => {
    getCurrentUserMock.mockResolvedValue({ id: userId });
    const { GET } = await import("./route");

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    const names = body.projects.map((p: { name: string }) => p.name);
    expect(names).toContain("Test Project Mine");
    expect(names).not.toContain("Test Project Theirs");
  });
});
