import { describe, expect, it } from "vitest";

import { validateAiResult } from "./schema";

const VALID = {
  summary: "This page explains how DynamoDB partition keys work.",
  category: "AWS",
  topics: ["DynamoDB", "partition keys", "NoSQL"],
  keyPoints: ["Uses a hash key.", "Supports GSIs.", "Scales horizontally."],
  contentType: "Documentation",
};

describe("validateAiResult", () => {
  it("accepts a well-formed result", () => {
    expect(validateAiResult(VALID)).toEqual(VALID);
  });

  it("rejects a non-object", () => {
    expect(validateAiResult("not an object")).toBeNull();
    expect(validateAiResult(null)).toBeNull();
    expect(validateAiResult(undefined)).toBeNull();
  });

  it("rejects a missing required field", () => {
    const { category, topics, keyPoints, contentType } = VALID;
    expect(validateAiResult({ category, topics, keyPoints, contentType })).toBeNull();
  });

  it("rejects too few topics", () => {
    expect(validateAiResult({ ...VALID, topics: ["one", "two"] })).toBeNull();
  });

  it("truncates rather than rejects when an array has one item too many", () => {
    const result = validateAiResult({ ...VALID, keyPoints: Array(8).fill("a point") });
    expect(result?.keyPoints).toHaveLength(7);
  });

  it("rejects when even the truncated array would be too short", () => {
    // Fewer real items than minItems even before any truncation — genuinely malformed.
    expect(validateAiResult({ ...VALID, keyPoints: ["only one point"] })).toBeNull();
  });

  it("rejects a summary that is not a string", () => {
    expect(validateAiResult({ ...VALID, summary: 12345 })).toBeNull();
  });

  it("rejects an oversized summary", () => {
    expect(validateAiResult({ ...VALID, summary: "x".repeat(5000) })).toBeNull();
  });

  it("rejects a non-array topics field", () => {
    expect(validateAiResult({ ...VALID, topics: "DynamoDB" })).toBeNull();
  });

  it("drops non-string entries and empty strings from arrays rather than accepting them", () => {
    const result = validateAiResult({
      ...VALID,
      topics: ["DynamoDB", 42, "", "partition keys", "NoSQL"],
    });
    expect(result?.topics).toEqual(["DynamoDB", "partition keys", "NoSQL"]);
  });

  it("trims whitespace from string fields", () => {
    const result = validateAiResult({ ...VALID, category: "  AWS  " });
    expect(result?.category).toBe("AWS");
  });
});
