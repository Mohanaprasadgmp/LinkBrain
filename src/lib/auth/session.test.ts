import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getCurrentUser`/`getCurrentUserId` are wrapped in React's `cache()`, which
 * memoizes for the lifetime of a render — there is no render pass here, so
 * each test resets the module registry (`vi.resetModules()`) and re-imports
 * `./session` fresh, rather than risking one test's mocked session leaking
 * into the next via a stale memoized value.
 */
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

// Not called by `requireUserIdForAction`/`getCurrentUserId` (only by
// `requireUser`/`requireUserId`, untested here), but `session.ts` imports it
// at module scope, and the real `next/navigation` module pulls in React's
// app-router client context, which fails to load in this plain Node test
// environment.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

beforeEach(() => {
  vi.resetModules();
  getSessionMock.mockReset();
});

describe("requireUserIdForAction", () => {
  it("returns ok:true with the session's userId when a session exists", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-123" } });
    const { requireUserIdForAction } = await import("./session");

    expect(await requireUserIdForAction()).toEqual({ ok: true, userId: "user-123" });
  });

  it("returns a safe ok:false error when there is no session, never a client-supplied id", async () => {
    getSessionMock.mockResolvedValue(null);
    const { requireUserIdForAction } = await import("./session");

    expect(await requireUserIdForAction()).toEqual({
      ok: false,
      error: "You must be signed in.",
    });
  });
});

describe("getCurrentUserId", () => {
  it("resolves to null rather than throwing when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);
    const { getCurrentUserId } = await import("./session");

    expect(await getCurrentUserId()).toBeNull();
  });

  it("resolves to the session user's id when authenticated", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-456" } });
    const { getCurrentUserId } = await import("./session");

    expect(await getCurrentUserId()).toBe("user-456");
  });
});
