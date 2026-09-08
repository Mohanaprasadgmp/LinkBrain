import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { links } from "./links";

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Display casing as first typed, e.g. "DynamoDB". */
  name: text("name").notNull(),
  /**
   * Normalised, unique form (via the existing `slugifyTag` util), e.g.
   * "dynamodb". This is what prevents "AWS" and "aws" becoming two tags —
   * the same de-duplication `deriveTags()` already did in memory, now
   * enforced by the database.
   */
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const linkTags = pgTable(
  "link_tags",
  {
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.linkId, table.tagId] }),
    // The composite primary key already indexes (linkId, tagId) for
    // link-first lookups; this covers the reverse "links for this tag" query.
    index("link_tags_tag_id_idx").on(table.tagId),
  ],
);
