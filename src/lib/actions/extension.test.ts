import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

beforeEach(() => {
  vi.resetModules();
  getSessionMock.mockReset();
});

describe("getExtensionHandoffToken", () => {
  it("returns ok:false without a session, never fabricating a token", async () => {
    getSessionMock.mockResolvedValue(null);
    const { getExtensionHandoffToken } = await import("./extension");

    const result = await getExtensionHandoffToken();

    expect(result).toEqual({ ok: false, error: "You must be signed in." });
  });

  it("returns the session's raw token and display-only user fields", async () => {
    getSessionMock.mockResolvedValue({
      session: { token: "raw-session-token" },
      user: { id: "u1", name: "Ada", email: "ada@example.com", image: "https://example.com/a.png" },
    });
    const { getExtensionHandoffToken } = await import("./extension");

    const result = await getExtensionHandoffToken();

    expect(result).toEqual({
      ok: true,
      token: "raw-session-token",
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
    });
  });
});
