import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { PRIORITY_ORDER } from "@/lib/domain/priority";
import { STATUS_ORDER } from "@/lib/domain/status";

import { projects } from "./projects";

/**
 * Postgres enums, built from the domain's existing value lists rather than
 * re-typing the same four/four strings a second time. This is reuse of the
 * canonical value set, not coupling: the enum only cares about which strings
 * are valid, and the repository's row-mapper (in `lib/data`) is still the
 * only place a database row becomes a `Link` — nothing here is imported by
 * UI or domain code.
 */
export const linkStatusEnum = pgEnum("link_status", STATUS_ORDER as [string, ...string[]]);
export const linkPriorityEnum = pgEnum("link_priority", PRIORITY_ORDER as [string, ...string[]]);

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    domain: text("domain").notNull(),
    favicon: text("favicon"),
    previewImage: text("preview_image"),
    personalNote: text("personal_note").notNull().default(""),
    status: linkStatusEnum("status").notNull().default("saved"),
    priority: linkPriorityEnum("priority").notNull().default("useful"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * Set whenever `status` moves to "archived", cleared when it moves away.
     * Kept consistent in one place: `DrizzleLinkRepository`'s update/status
     * methods, never duplicated across call sites.
     */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("links_created_at_idx").on(table.createdAt),
    index("links_status_idx").on(table.status),
    index("links_priority_idx").on(table.priority),
    index("links_is_favorite_idx").on(table.isFavorite),
    index("links_domain_idx").on(table.domain),
    index("links_archived_at_idx").on(table.archivedAt),
    index("links_project_id_idx").on(table.projectId),
  ],
);
