import { relations } from "drizzle-orm";

import { links } from "./links";
import { projects } from "./projects";
import { linkTags, tags } from "./tags";

/**
 * All `relations()` definitions live in one file, separate from the table
 * definitions themselves.
 *
 * `links` and `tags`/`linkTags` each need to know about the other for the
 * many-to-many relationship, which would make `links.ts` and `tags.ts`
 * import each other if their `relations()` calls lived inline — a real
 * circular module dependency. Centralising them here (a leaf module that
 * depends on every table file, but that no table file depends back on)
 * avoids that entirely.
 */

export const linksRelations = relations(links, ({ one, many }) => ({
  project: one(projects, {
    fields: [links.projectId],
    references: [projects.id],
  }),
  linkTags: many(linkTags),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  links: many(links),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  linkTags: many(linkTags),
}));

export const linkTagsRelations = relations(linkTags, ({ one }) => ({
  link: one(links, {
    fields: [linkTags.linkId],
    references: [links.id],
  }),
  tag: one(tags, {
    fields: [linkTags.tagId],
    references: [tags.id],
  }),
}));
