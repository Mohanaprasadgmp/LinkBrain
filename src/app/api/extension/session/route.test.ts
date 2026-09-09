import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTENSION_ORIGINS } from "@/config/extension";

const EXTENSION_ORIGIN = EXTENSION_ORIGINS[0];

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

beforeEach(() => {
  getCurrentUserMock.mockReset();
});

function getRequest() {
  return new NextRequest("http://localhost:3000/api/extension/session", {
    headers: { Origin: EXTENSION_ORIGIN },
  });
}

describe("GET /api/extension/session", () => {
  it("returns 401 when there is no session", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
  });

  it("returns only display fields for the authenticated user, never credential-shaped data", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    const { GET } = await import("./route");

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual({ id: "user-1", name: "Ada Lovelace", email: "ada@example.com" });
    expect(JSON.stringify(body)).not.toMatch(/token|secret|password/i);
  });
});
