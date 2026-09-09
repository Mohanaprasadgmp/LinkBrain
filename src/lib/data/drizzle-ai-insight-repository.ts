import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { linkAiInsights } from "@/lib/db/schema";
import type { AiInsight } from "@/lib/domain/types";

import type { AiInsightCompletion, AiInsightRepository } from "./repository";

type AiInsightRow = typeof linkAiInsights.$inferSelect;

/** The only place a raw Drizzle row becomes an `AiInsight` — `promptVersion` is deliberately not exposed past this boundary (see `AiInsight`'s doc comment). */
function rowToAiInsight(row: AiInsightRow): AiInsight {
  return {
    id: row.id,
    linkId: row.linkId,
    status: row.processingStatus,
    summary: row.summary,
    category: row.category,
    topics: row.topics ?? [],
    keyPoints: row.keyPoints ?? [],
    contentType: row.contentType,
    errorReason: row.errorReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleAiInsightRepository implements AiInsightRepository {
  async getByLinkId(linkId: string): Promise<AiInsight | null> {
    const row = await getDb().query.linkAiInsights.findFirst({
      where: eq(linkAiInsights.linkId, linkId),
    });
    return row ? rowToAiInsight(row) : null;
  }

  async insertPending(linkId: string): Promise<AiInsight> {
    // `onConflictDoNothing` makes this safe against the (expected-never, but
    // not worth crashing over) case of a second insert attempt for the same
    // link — the unique constraint on `linkId` is the actual guarantee of
    // "at most one row," this just avoids surfacing that as a thrown error.
    await getDb()
      .insert(linkAiInsights)
      .values({ linkId, processingStatus: "pending" })
      .onConflictDoNothing({ target: linkAiInsights.linkId });

    const created = await this.getByLinkId(linkId);
    if (!created) {
      throw new Error("Failed to read back the AI insight row that was just created.");
    }
    return created;
  }

  async tryStartProcessing(linkId: string): Promise<AiInsight | null> {
    return this.claimFrom(linkId, ["pending", "failed"]);
  }

  async tryStartRegeneration(linkId: string): Promise<AiInsight | null> {
    return this.claimFrom(linkId, ["pending", "failed", "completed"]);
  }

  /** Shared compare-and-swap: flips to `"processing"` only from one of `fromStatuses`. */
  private async claimFrom(
    linkId: string,
    fromStatuses: (typeof linkAiInsights.processingStatus.enumValues)[number][],
  ): Promise<AiInsight | null> {
    const [row] = await getDb()
      .update(linkAiInsights)
      .set({ processingStatus: "processing", errorReason: null, updatedAt: sql`now()` })
      .where(and(eq(linkAiInsights.linkId, linkId), inArray(linkAiInsights.processingStatus, fromStatuses)))
      .returning();

    return row ? rowToAiInsight(row) : null;
  }

  async markCompleted(linkId: string, result: AiInsightCompletion): Promise<AiInsight | null> {
    const [row] = await getDb()
      .update(linkAiInsights)
      .set({
        processingStatus: "completed",
        summary: result.summary,
        category: result.category,
        topics: result.topics,
        keyPoints: result.keyPoints,
        contentType: result.contentType,
        model: result.model,
        promptVersion: result.promptVersion,
        errorReason: null,
        updatedAt: sql`now()`,
      })
      .where(eq(linkAiInsights.linkId, linkId))
      .returning();

    return row ? rowToAiInsight(row) : null;
  }

  async markFailed(linkId: string, reason: string): Promise<AiInsight | null> {
    const [row] = await getDb()
      .update(linkAiInsights)
      .set({ processingStatus: "failed", errorReason: reason, updatedAt: sql`now()` })
      .where(eq(linkAiInsights.linkId, linkId))
      .returning();

    return row ? rowToAiInsight(row) : null;
  }
}
