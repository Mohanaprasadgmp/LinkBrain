import { like } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { links, projects, user as userTable } from "@/lib/db/schema";

/**
 * Test data lives under an identifiable marker so it can be cleaned up
 * without touching real data if these tests ever run against a database
 * that isn't a scratch/test instance (though a dedicated Neon branch,
 * separate from your dev data, is what the tests actually expect — see
 * README's testing section).
 */
export const TEST_URL_PREFIX = "https://test.linkbrain.internal/";
export const TEST_PROJECT_PREFIX = "Test Project ";
export const TEST_USER_EMAIL_PREFIX = "test-user-";

export function testUrl(path: string): string {
  return `${TEST_URL_PREFIX}${path}`;
}

/**
 * Creates a throwaway user row directly (no need to exercise the full
 * Better Auth signup flow just to get an id to own test data) — repository
 * tests only need a valid `userId` to scope through via `.forUser()`, not a
 * real session. `label` just makes the row identifiable in a DB browser.
 */
export async function createTestUser(label: string): Promise<string> {
  const id = `test-user-${crypto.randomUUID()}`;
  await getDb()
    .insert(userTable)
    .values({
      id,
      name: `Test User ${label}`,
      email: `${TEST_USER_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    });
  return id;
}

/**
 * Deletes every row this test suite could have created. Test users are
 * deleted first: their `userId` foreign key is `onDelete: "cascade"` on
 * `links`/`projects`, so removing a test user removes everything it owns in
 * one step. The prefix-based deletes below it are a fallback for anything
 * not attached to a test user.
 */
export async function cleanupTestData(): Promise<void> {
  const db = getDb();
  await db.delete(userTable).where(like(userTable.email, `${TEST_USER_EMAIL_PREFIX}%`));
  await db.delete(links).where(like(links.url, `${TEST_URL_PREFIX}%`));
  await db.delete(projects).where(like(projects.name, `${TEST_PROJECT_PREFIX}%`));
}
