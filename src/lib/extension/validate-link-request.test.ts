import { describe, expect, it } from "vitest";

import { validateLinkRequest } from "./validate-link-request";

describe("validateLinkRequest", () => {
  it("rejects a non-object body", () => {
    expect(validateLinkRequest("not an object").ok).toBe(false);
    expect(validateLinkRequest(null).ok).toBe(false);
    expect(validateLinkRequest([]).ok).toBe(false);
  });

  it("rejects a missing url", () => {
    const result = validateLinkRequest({});
    expect(result.ok).toBe(false);
  });

  it("rejects a wrong-typed field", () => {
    expect(validateLinkRequest({ url: "https://example.com", title: 123 }).ok).toBe(false);
    expect(
      validateLinkRequest({ url: "https://example.com", projectId: 123 }).ok,
    ).toBe(false);
    expect(validateLinkRequest({ url: "https://example.com", force: "yes" }).ok).toBe(false);
  });

  it("rejects an unknown status or priority", () => {
    expect(validateLinkRequest({ url: "https://example.com", status: "done" }).ok).toBe(false);
    expect(
      validateLinkRequest({ url: "https://example.com", priority: "urgent" }).ok,
    ).toBe(false);
  });

  it("never accepts a userId field as part of the parsed input", () => {
    const result = validateLinkRequest({
      url: "https://example.com",
      userId: "someone-elses-id",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.input).not.toHaveProperty("userId");
    }
  });

  it("accepts a minimal, valid request", () => {
    const result = validateLinkRequest({ url: "https://example.com" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.input.url).toBe("https://example.com");
      expect(result.data.force).toBe(false);
    }
  });

  it("maps personalNote to the domain's note field", () => {
    const result = validateLinkRequest({
      url: "https://example.com",
      personalNote: "Why this matters",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.input.note).toBe("Why this matters");
  });
});
