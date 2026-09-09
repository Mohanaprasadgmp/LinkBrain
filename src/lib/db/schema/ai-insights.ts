import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { links } from "./links";

/**
 * Phase 7: AI-generated enrichment for a link, kept in its own table rather
 * than as columns on `links` (per the brief) — a link is fully valid and
 * usable with zero rows here; this table only ever adds information, never
 * gates it. One row per link (`unique(linkId)`), cascade-deleted with it.
 *
 * Deliberately no `userId` column: ownership is inherited, not duplicated —
 * every write/read here happens only after the caller has already resolved
 * the link through `getLinkRepository().forUser(userId).get(linkId)` (see
 * `lib/ai/ai-service.ts` and `lib/actions/ai.ts`), the same "not found and
 * not yours look identical" guarantee every other table in this app already
 * relies on (see `docs/ARCHITECTURE.md`'s "Repository security" section).
 */
export const aiProcessingStatusEnum = pgEnum("ai_processing_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const linkAiInsights = pgTable(
  "link_ai_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    processingStatus: aiProcessingStatusEnum("processing_status").notNull().default("pending"),
    summary: text("summary"),
    /** Plain text, not an enum — the brief is explicit the taxonomy must stay free to evolve. */
    category: text("category"),
    topics: text("topics").array(),
    keyPoints: text("key_points").array(),
    contentType: text("content_type"),
    /** Which `OPENAI_MODEL` produced this result — for diagnostics, not shown to end users as a feature. */
    model: text("model"),
    /**
     * Bumped only when the prompt/schema meaningfully changes (see
     * `lib/ai/prompt.ts`'s `PROMPT_VERSION`) — recorded for future
     * debugging/migration, not read anywhere yet.
     */
    promptVersion: integer("prompt_version"),
    /**
     * A coarse, safe failure category (never a raw error message or stack
     * trace) — mirrors `lib/metadata/types.ts`'s `MetadataFailureReason`
     * pattern. Null unless `processingStatus` is `"failed"`.
     */
    errorReason: text("error_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("link_ai_insights_link_id_unique").on(table.linkId),
    index("link_ai_insights_processing_status_idx").on(table.processingStatus),
  ],
);
