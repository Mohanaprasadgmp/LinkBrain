import OpenAI from "openai";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `processLinkAi` is the one place `openai.responses.create` is called —
 * these tests mock it completely (`@/lib/ai/openai-client`), so `npm test`
 * never makes a real network request and needs no `OPENAI_API_KEY`, per the
 * brief's explicit requirement. The repository layer runs for real against
 * the same test Postgres database every other repository test uses, since
 * the compare-and-swap/persistence behavior is exactly what's worth proving
 * here — not something to also mock away.
 */
const responsesCreateMock = vi.fn();
const isAiConfiguredMock = vi.fn();

vi.mock("@/lib/ai/openai-client", () => ({
  isAiConfigured: () => isAiConfiguredMock(),
  getConfiguredModel: () => "gpt-5.6-luna",
  getOpenAiClient: () => ({ responses: { create: responsesCreateMock } }),
}));

import { getAiInsightRepository } from "@/lib/data";
import { DrizzleLinkRepository } from "@/lib/data/drizzle-link-repository";
import { cleanupTestData, createTestUser, testUrl } from "@/lib/data/test-helpers";

import { processLinkAi } from "./ai-service";

const linkRepo = new DrizzleLinkRepository();
const aiRepo = getAiInsightRepository();

const VALID_PAYLOAD = {
  summary: "A concise, factual summary of the page.",
  category: "AWS",
  topics: ["DynamoDB", "partition keys", "pagination"],
  keyPoints: ["Uses a hash key.", "Supports GSIs.", "Scales horizontally."],
  contentType: "Documentation",
};

const BASE_CONTEXT = {
  url: "https://example.com",
  title: "T",
  description: "",
  domain: "example.com",
  html: null as string | null,
};

function mockResponse(payload: unknown, usage = { input_tokens: 100, output_tokens: 50, total_tokens: 150 }) {
  responsesCreateMock.mockResolvedValue({ output_text: JSON.stringify(payload), usage });
}

let userId: string;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("AI Service");
});
afterAll(cleanupTestData);

beforeEach(() => {
  responsesCreateMock.mockReset();
  isAiConfiguredMock.mockReset();
  isAiConfiguredMock.mockReturnValue(true);
});

async function createLinkId(): Promise<string> {
  const link = await linkRepo.forUser(userId).create({
    url: testUrl(`ai-service-${crypto.randomUUID()}`),
    title: "Test link",
  });
  return link.id;
}

describe("processLinkAi", () => {
  it("does nothing when AI isn't configured", async () => {
    isAiConfiguredMock.mockReturnValue(false);
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);

    const result = await processLinkAi(linkId, BASE_CONTEXT);

    expect(result).toBeNull();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("persists a completed result on a valid structured response", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    mockResponse(VALID_PAYLOAD);

    const result = await processLinkAi(linkId, {
      ...BASE_CONTEXT,
      url: "https://docs.aws.amazon.com/dynamodb",
      title: "DynamoDB Docs",
      domain: "docs.aws.amazon.com",
      html: "<html><body><p>DynamoDB uses partition keys.</p></body></html>",
    });

    expect(result?.status).toBe("completed");
    expect(result?.summary).toBe(VALID_PAYLOAD.summary);
    expect(result?.topics).toEqual(VALID_PAYLOAD.topics);

    const stored = await aiRepo.getByLinkId(linkId);
    expect(stored?.status).toBe("completed");
  });

  it("marks failed on malformed JSON output", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    responsesCreateMock.mockResolvedValue({ output_text: "not json at all", usage: {} });

    const result = await processLinkAi(linkId, BASE_CONTEXT);

    expect(result).toBeNull();
    const stored = await aiRepo.getByLinkId(linkId);
    expect(stored?.status).toBe("failed");
    expect(stored?.errorReason).toBe("invalid-response");
  });

  it("marks failed when the response violates the schema (missing fields)", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    mockResponse({ summary: "only a summary" });

    await processLinkAi(linkId, BASE_CONTEXT);

    const stored = await aiRepo.getByLinkId(linkId);
    expect(stored?.status).toBe("failed");
    expect(stored?.errorReason).toBe("invalid-response");
  });

  it("classifies a rate-limit error safely, never leaking the raw error", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    responsesCreateMock.mockRejectedValue(
      new OpenAI.RateLimitError(429, { error: { message: "slow down" } }, "slow down", new Headers()),
    );

    await processLinkAi(linkId, BASE_CONTEXT);

    const stored = await aiRepo.getByLinkId(linkId);
    expect(stored?.status).toBe("failed");
    expect(stored?.errorReason).toBe("rate-limited");
  });

  it("classifies a timeout error safely", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    responsesCreateMock.mockRejectedValue(new OpenAI.APIConnectionTimeoutError());

    await processLinkAi(linkId, BASE_CONTEXT);

    const stored = await aiRepo.getByLinkId(linkId);
    expect(stored?.errorReason).toBe("timeout");
  });

  it("prevents duplicate concurrent processing for the same link", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    mockResponse(VALID_PAYLOAD);

    const [first, second] = await Promise.all([
      processLinkAi(linkId, BASE_CONTEXT),
      processLinkAi(linkId, BASE_CONTEXT),
    ]);

    // Exactly one of the two concurrent calls should have actually reached
    // OpenAI and completed; the other loses the compare-and-swap race and
    // returns null without ever calling the mock.
    const succeeded = [first, second].filter((r) => r !== null);
    expect(succeeded).toHaveLength(1);
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("does not reprocess a link that already has a completed result (automatic path)", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    mockResponse(VALID_PAYLOAD);
    await processLinkAi(linkId, BASE_CONTEXT);
    responsesCreateMock.mockClear();

    const secondAttempt = await processLinkAi(linkId, BASE_CONTEXT);

    expect(secondAttempt).toBeNull();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("regenerate:true CAN reprocess a completed link", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    mockResponse(VALID_PAYLOAD);
    await processLinkAi(linkId, BASE_CONTEXT);
    responsesCreateMock.mockClear();
    mockResponse({ ...VALID_PAYLOAD, summary: "An updated summary." });

    const result = await processLinkAi(linkId, BASE_CONTEXT, { regenerate: true });

    expect(result?.summary).toBe("An updated summary.");
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
  });
});
