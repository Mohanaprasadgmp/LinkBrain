import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `regenerateAiInsights` is the only user-facing entry point into AI
 * processing besides the automatic path — these tests exercise ownership
 * enforcement (a user can never regenerate another user's link) and the
 * cooldown/concurrency guards for real, against the same test Postgres
 * database every other repository/action test uses. Only the OpenAI client
 * itself is mocked (via `@/lib/ai/openai-client`) and the session (via
 * `@/lib/auth/session`) — never the network, never a real API key.
 */
const getCurrentUserIdMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireUserIdForAction: async () => {
    const userId = getCurrentUserIdMock();
    return userId ? { ok: true, userId } : { ok: false, error: "You must be signed in." };
  },
}));

const isAiConfiguredMock = vi.fn();
const responsesCreateMock = vi.fn();
vi.mock("@/lib/ai/openai-client", () => ({
  isAiConfigured: () => isAiConfiguredMock(),
  getConfiguredModel: () => "gpt-5.6-luna",
  getOpenAiClient: () => ({ responses: { create: responsesCreateMock } }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const extractMetadataMock = vi.fn();
vi.mock("@/lib/metadata", () => ({
  extractMetadata: (...args: unknown[]) => extractMetadataMock(...args),
}));

import { getAiInsightRepository } from "@/lib/data";
import { DrizzleLinkRepository } from "@/lib/data/drizzle-link-repository";
import { cleanupTestData, createTestUser, testUrl } from "@/lib/data/test-helpers";

import { regenerateAiInsights } from "./ai";

const linkRepo = new DrizzleLinkRepository();
const aiRepo = getAiInsightRepository();

const VALID_PAYLOAD = {
  summary: "A concise, factual summary of the page.",
  category: "AWS",
  topics: ["DynamoDB", "partition keys", "pagination"],
  keyPoints: ["Uses a hash key.", "Supports GSIs.", "Scales horizontally."],
  contentType: "Documentation",
};

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("AI Action");
  otherUserId = await createTestUser("AI Action Other");
});
afterAll(cleanupTestData);

beforeEach(() => {
  getCurrentUserIdMock.mockReset();
  isAiConfiguredMock.mockReset();
  isAiConfiguredMock.mockReturnValue(true);
  responsesCreateMock.mockReset();
  responsesCreateMock.mockResolvedValue({
    output_text: JSON.stringify(VALID_PAYLOAD),
    usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
  });
  extractMetadataMock.mockReset();
  extractMetadataMock.mockResolvedValue({ ok: false, reason: "network-error" });
});

async function createLinkId(owner: string): Promise<string> {
  const link = await linkRepo.forUser(owner).create({
    url: testUrl(`ai-action-${crypto.randomUUID()}`),
    title: "Test link",
  });
  return link.id;
}

describe("regenerateAiInsights", () => {
  it("rejects an unauthenticated request", async () => {
    getCurrentUserIdMock.mockReturnValue(null);
    const linkId = await createLinkId(userId);

    const result = await regenerateAiInsights(linkId);

    expect(result.ok).toBe(false);
  });

  it("rejects when AI isn't configured", async () => {
    getCurrentUserIdMock.mockReturnValue(userId);
    isAiConfiguredMock.mockReturnValue(false);
    const linkId = await createLinkId(userId);

    const result = await regenerateAiInsights(linkId);

    expect(result.ok).toBe(false);
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a link that does not exist", async () => {
    getCurrentUserIdMock.mockReturnValue(userId);

    const result = await regenerateAiInsights("00000000-0000-0000-0000-000000000000");

    expect(result.ok).toBe(false);
  });

  it("never allows a user to regenerate another user's link", async () => {
    getCurrentUserIdMock.mockReturnValue(userId);
    const otherUsersLink = await createLinkId(otherUserId);

    const result = await regenerateAiInsights(otherUsersLink);

    expect(result.ok).toBe(false);
    expect(responsesCreateMock).not.toHaveBeenCalled();
    // Confirm it truly never touched OpenAI for the other user's link, not
    // just that this call reported failure.
    const insight = await aiRepo.getByLinkId(otherUsersLink);
    expect(insight).toBeNull();
  });

  it("successfully regenerates and persists a completed result", async () => {
    getCurrentUserIdMock.mockReturnValue(userId);
    const linkId = await createLinkId(userId);

    const result = await regenerateAiInsights(linkId);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("completed");
  });

  it("refuses a second regenerate within the cooldown window", async () => {
    getCurrentUserIdMock.mockReturnValue(userId);
    const linkId = await createLinkId(userId);

    const first = await regenerateAiInsights(linkId);
    expect(first.ok).toBe(true);

    const second = await regenerateAiInsights(linkId);
    expect(second.ok).toBe(false);
  });

  it("refuses to regenerate a link that is currently processing", async () => {
    getCurrentUserIdMock.mockReturnValue(userId);
    const linkId = await createLinkId(userId);
    await aiRepo.insertPending(linkId);
    await aiRepo.tryStartProcessing(linkId);

    const result = await regenerateAiInsights(linkId);

    expect(result.ok).toBe(false);
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });
});
