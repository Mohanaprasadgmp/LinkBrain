import { relations } from "drizzle-orm";

import { links } from "./links";
import { projects } from "./projects";

/**
 * All `relations()` definitions live in one file, separate from the table
 * definitions themselves — a leaf module that depends on every table file,
 * but that no table file depends back on.
 */

export const linksRelations = relations(links, ({ one }) => ({
  project: one(projects, {
    fields: [links.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  links: many(links),
}));
