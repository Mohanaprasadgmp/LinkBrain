import { like } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { links, projects, tags } from "@/lib/db/schema";

/**
 * Test data lives under an identifiable marker so it can be cleaned up
 * without touching real data if these tests ever run against a database
 * that isn't a scratch/test instance (though a dedicated Neon branch,
 * separate from your dev data, is what the tests actually expect — see
 * README's testing section).
 */
export const TEST_URL_PREFIX = "https://test.linkbrain.internal/";
export const TEST_PROJECT_PREFIX = "Test Project ";
export const TEST_TAG_PREFIX = "test-tag-";

export function testUrl(path: string): string {
  return `${TEST_URL_PREFIX}${path}`;
}

/**
 * Deletes every row this test suite could have created. Deleting `links`
 * first cascades their `link_tags` rows automatically (see the FK's
 * `onDelete: "cascade"` in `lib/db/schema/tags.ts`).
 */
export async function cleanupTestData(): Promise<void> {
  const db = getDb();
  await db.delete(links).where(like(links.url, `${TEST_URL_PREFIX}%`));
  await db.delete(tags).where(like(tags.slug, `${TEST_TAG_PREFIX}%`));
  await db.delete(projects).where(like(projects.name, `${TEST_PROJECT_PREFIX}%`));
}
