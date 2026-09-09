import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleLinkRepository } from "./drizzle-link-repository";
import { DrizzleAiInsightRepository } from "./drizzle-ai-insight-repository";
import type { UserScopedLinkRepository } from "./repository";
import { cleanupTestData, createTestUser, testUrl } from "./test-helpers";

/**
 * Hits a real Postgres database via `DATABASE_URL`, same as
 * `drizzle-link-repository.test.ts`. No `userId` scoping to test here on
 * purpose — see `lib/db/schema/ai-insights.ts`'s doc comment on why this
 * repository has no `forUser()`; ownership is exercised at the
 * `lib/actions/ai.test.ts` layer instead, where a `linkId` is actually
 * resolved through a user-scoped link repository first.
 */
const aiRepo = new DrizzleAiInsightRepository();
const linkRepo = new DrizzleLinkRepository();

let userId: string;
let scopedLinks: UserScopedLinkRepository;

beforeAll(async () => {
  await cleanupTestData();
  userId = await createTestUser("AI Insight Repo");
  scopedLinks = linkRepo.forUser(userId);
});
afterAll(cleanupTestData);

async function createLinkId(): Promise<string> {
  const link = await scopedLinks.create({ url: testUrl(`ai-${crypto.randomUUID()}`), title: "Test" });
  return link.id;
}

describe("DrizzleAiInsightRepository", () => {
  it("insertPending creates a row with status pending", async () => {
    const linkId = await createLinkId();

    const insight = await aiRepo.insertPending(linkId);

    expect(insight.linkId).toBe(linkId);
    expect(insight.status).toBe("pending");
    expect(insight.summary).toBeNull();
  });

  it("insertPending is idempotent for the same link", async () => {
    const linkId = await createLinkId();

    const first = await aiRepo.insertPending(linkId);
    const second = await aiRepo.insertPending(linkId);

    expect(second.id).toBe(first.id);
  });

  it("getByLinkId returns null when no row exists", async () => {
    const linkId = await createLinkId();
    expect(await aiRepo.getByLinkId(linkId)).toBeNull();
  });

  it("tryStartProcessing claims a pending row and flips it to processing", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);

    const claimed = await aiRepo.tryStartProcessing(linkId);

    expect(claimed?.status).toBe("processing");
  });

  it("tryStartProcessing refuses to claim a row that is already processing", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    await aiRepo.tryStartProcessing(linkId);

    const secondClaim = await aiRepo.tryStartProcessing(linkId);

    expect(secondClaim).toBeNull();
  });

  it("tryStartProcessing refuses to reprocess a completed link (the automatic-path guarantee)", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    await aiRepo.tryStartProcessing(linkId);
    await aiRepo.markCompleted(linkId, {
      summary: "s",
      category: "c",
      topics: ["a", "b", "c"],
      keyPoints: ["a", "b", "c"],
      contentType: "Article",
      model: "gpt-5.6-luna",
      promptVersion: 1,
    });

    const claim = await aiRepo.tryStartProcessing(linkId);

    expect(claim).toBeNull();
  });

  it("tryStartRegeneration CAN claim a completed link, but not a currently-processing one", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    await aiRepo.tryStartProcessing(linkId);
    await aiRepo.markCompleted(linkId, {
      summary: "s",
      category: "c",
      topics: ["a", "b", "c"],
      keyPoints: ["a", "b", "c"],
      contentType: "Article",
      model: "gpt-5.6-luna",
      promptVersion: 1,
    });

    const claimed = await aiRepo.tryStartRegeneration(linkId);
    expect(claimed?.status).toBe("processing");

    const blocked = await aiRepo.tryStartRegeneration(linkId);
    expect(blocked).toBeNull();
  });

  it("markCompleted persists every field and clears any prior error", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    await aiRepo.tryStartProcessing(linkId);
    await aiRepo.markFailed(linkId, "timeout");

    const completed = await aiRepo.markCompleted(linkId, {
      summary: "A concise summary.",
      category: "AWS",
      topics: ["DynamoDB", "GSI", "pagination"],
      keyPoints: ["Point one.", "Point two.", "Point three."],
      contentType: "Documentation",
      model: "gpt-5.6-luna",
      promptVersion: 1,
    });

    expect(completed?.status).toBe("completed");
    expect(completed?.errorReason).toBeNull();
    expect(completed?.summary).toBe("A concise summary.");
    expect(completed?.topics).toEqual(["DynamoDB", "GSI", "pagination"]);
  });

  it("markFailed records a safe, coarse error reason", async () => {
    const linkId = await createLinkId();
    await aiRepo.insertPending(linkId);
    await aiRepo.tryStartProcessing(linkId);

    const failed = await aiRepo.markFailed(linkId, "rate-limited");

    expect(failed?.status).toBe("failed");
    expect(failed?.errorReason).toBe("rate-limited");
  });
});
