import { describe, expect, it } from "vitest";

import { isRateLimited } from "./rate-limit";

describe("isRateLimited", () => {
  it("allows requests under the limit", () => {
    const userId = `user-${crypto.randomUUID()}`;
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
      expect(isRateLimited(userId, now)).toBe(false);
    }
  });

  it("blocks the request past the limit within the same window", () => {
    const userId = `user-${crypto.randomUUID()}`;
    const now = Date.now();

    for (let i = 0; i < 20; i++) isRateLimited(userId, now);

    expect(isRateLimited(userId, now)).toBe(true);
  });

  it("scopes the limit per user", () => {
    const userA = `user-${crypto.randomUUID()}`;
    const userB = `user-${crypto.randomUUID()}`;
    const now = Date.now();

    for (let i = 0; i < 20; i++) isRateLimited(userA, now);

    expect(isRateLimited(userA, now)).toBe(true);
    expect(isRateLimited(userB, now)).toBe(false);
  });

  it("allows requests again once the window has passed", () => {
    const userId = `user-${crypto.randomUUID()}`;
    const now = Date.now();

    for (let i = 0; i < 20; i++) isRateLimited(userId, now);
    expect(isRateLimited(userId, now)).toBe(true);

    expect(isRateLimited(userId, now + 61_000)).toBe(false);
  });
});
