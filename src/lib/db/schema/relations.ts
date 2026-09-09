import { relations } from "drizzle-orm";

import { linkAiInsights } from "./ai-insights";
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
  aiInsight: one(linkAiInsights, {
    fields: [links.id],
    references: [linkAiInsights.linkId],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  links: many(links),
}));

export const linkAiInsightsRelations = relations(linkAiInsights, ({ one }) => ({
  link: one(links, {
    fields: [linkAiInsights.linkId],
    references: [links.id],
  }),
}));
