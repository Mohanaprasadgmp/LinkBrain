/**
 * Development seed script.
 *
 * Run with `npm run db:seed`. Wipes the links/tags/projects tables and
 * reseeds them from the same fixture content Phase 1's UI ran on
 * (`lib/data/fixtures/*`), so the database reads exactly like the app you've
 * already been looking at — this is dev/test data only, never meant to run
 * against anything but a scratch database.
 *
 * Written as direct schema-level inserts rather than going through
 * `LinkRepository.create()`: the repository always stamps `createdAt` as
 * "now," which would flatten every seeded link to the same instant and lose
 * the fixtures' deliberately varied "2 days ago" / "13 hours ago" timestamps
 * that make relative-date display worth looking at.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { getDb } from "./index";
import { linkTags, links, projects, tags } from "./schema";
import { LINK_FIXTURES } from "@/lib/data/fixtures/links";
import { PROJECT_FIXTURES } from "@/lib/data/fixtures/projects";
import { slugifyTag } from "@/lib/utils/tags";

async function seed() {
  const db = getDb();

  console.log("Clearing existing data...");
  await db.delete(linkTags);
  await db.delete(links);
  await db.delete(tags);
  await db.delete(projects);

  console.log("Seeding projects...");
  const projectIdByFixtureId = new Map<string, string>();
  for (const fixture of PROJECT_FIXTURES) {
    const [row] = await db
      .insert(projects)
      .values({
        name: fixture.name,
        description: fixture.description,
        createdAt: new Date(fixture.createdAt),
        updatedAt: new Date(fixture.updatedAt),
      })
      .returning({ id: projects.id });
    projectIdByFixtureId.set(fixture.id, row.id);
  }

  console.log("Seeding tags...");
  const tagIdBySlug = new Map<string, string>();
  const seenTagNames = new Set<string>();
  for (const link of LINK_FIXTURES) {
    for (const name of link.tags) {
      const slug = slugifyTag(name);
      if (!slug || seenTagNames.has(slug)) continue;
      seenTagNames.add(slug);

      const [row] = await db
        .insert(tags)
        .values({ name, slug })
        .returning({ id: tags.id });
      tagIdBySlug.set(slug, row.id);
    }
  }

  console.log("Seeding links...");
  for (const fixture of LINK_FIXTURES) {
    const [row] = await db
      .insert(links)
      .values({
        url: fixture.url,
        title: fixture.title,
        description: fixture.description,
        domain: fixture.domain,
        personalNote: fixture.note,
        status: fixture.status,
        priority: fixture.priority,
        isFavorite: fixture.isFavorite,
        projectId: fixture.projectId
          ? (projectIdByFixtureId.get(fixture.projectId) ?? null)
          : null,
        createdAt: new Date(fixture.createdAt),
        updatedAt: new Date(fixture.updatedAt),
        archivedAt: fixture.status === "archived" ? new Date(fixture.updatedAt) : null,
      })
      .returning({ id: links.id });

    for (const name of fixture.tags) {
      const tagId = tagIdBySlug.get(slugifyTag(name));
      if (!tagId) continue;
      await db.insert(linkTags).values({ linkId: row.id, tagId });
    }
  }

  console.log(
    `Seeded ${PROJECT_FIXTURES.length} projects, ${tagIdBySlug.size} tags, ${LINK_FIXTURES.length} links.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
