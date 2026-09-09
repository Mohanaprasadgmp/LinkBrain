/**
 * Development seed script.
 *
 * Run with `npm run db:seed`. Wipes the links/projects tables and reseeds
 * them from the same fixture content Phase 1's UI ran on
 * (`lib/data/fixtures/*`), so the database reads exactly like the app you've
 * already been looking at — this is dev/test data only, never meant to run
 * against anything but a scratch database.
 *
 * Written as direct schema-level inserts rather than going through
 * `LinkRepository.create()`: the repository always stamps `createdAt` as
 * "now," which would flatten every seeded link to the same instant and lose
 * the fixtures' deliberately varied "2 days ago" / "13 hours ago" timestamps
 * that make relative-date display worth looking at.
 *
 * Phase 5: every seeded row now belongs to a deterministic **development
 * user** (`ensureDevUser` below) rather than being ownerless — `userId` is
 * `NOT NULL` on `links`/`projects`, so there's no other option, and this
 * is also how this project's already-populated dev database itself was
 * migrated: nullable `userId` columns landed first, this script's dev user
 * was created, a normal `db:seed` run assigned every row to it (a wipe and
 * full reseed is already this script's job), and only then did a later
 * migration tighten the columns to `NOT NULL`. Sign in locally with
 * `DEV_USER_EMAIL`/`DEV_USER_PASSWORD` below to see this seeded data.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { eq } from "drizzle-orm";

import { getDb } from "./index";
import { links, projects, user as userTable } from "./schema";
import { LINK_FIXTURES } from "@/lib/data/fixtures/links";
import { PROJECT_FIXTURES } from "@/lib/data/fixtures/projects";

const DEV_USER_EMAIL = "mohanaprasadgmp@gmail.com";
const DEV_USER_NAME = "Mohana Prasad";
/**
 * Local development only — this is what you sign in with after seeding, on
 * your own machine against your own dev database. Never used in production,
 * where every real account goes through its own chosen password or Google.
 * Not treated as a secret (it's committed in plain text right here) because
 * it only ever protects throwaway local fixture data, the same way this
 * whole script is safe to commit despite inserting real-looking rows.
 */
const DEV_USER_PASSWORD = "linkbrain-dev-password";

/**
 * Better Auth's `auth` instance connects to the database as soon as it's
 * imported (see `lib/auth.ts`'s doc comment), so it's imported dynamically
 * here, after `loadEnvConfig` above has already populated `DATABASE_URL` —
 * a static top-level import would be hoisted ahead of that call and fail.
 */
async function ensureDevUser(): Promise<string> {
  const db = getDb();

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, DEV_USER_EMAIL))
    .limit(1);
  if (existing) return existing.id;

  const { auth } = await import("@/lib/auth");
  const created = await auth.api.signUpEmail({
    body: { name: DEV_USER_NAME, email: DEV_USER_EMAIL, password: DEV_USER_PASSWORD },
  });

  /**
   * Better Auth leaves new email/password accounts unverified by default —
   * correct for a real signup, where the email hasn't been proven yet. This
   * dev user's address is different: it's this project's own real,
   * already-owned email (`DEV_USER_EMAIL`), not an untrusted claim, so
   * marking it verified reflects reality rather than bypassing a check. It
   * also avoids `account_not_linked` if you later sign in with Google using
   * the same address — Better Auth refuses to link a Google identity to an
   * unverified local account (see `requireLocalEmailVerified` in its
   * account-linking logic), which is the right call for a stranger-supplied
   * email but not for this deterministic fixture account.
   */
  await db.update(userTable).set({ emailVerified: true }).where(eq(userTable.id, created.user.id));

  return created.user.id;
}

async function seed() {
  const db = getDb();

  console.log("Ensuring the development user exists...");
  const devUserId = await ensureDevUser();

  console.log("Clearing existing data...");
  await db.delete(links);
  await db.delete(projects);

  console.log("Seeding projects...");
  const projectIdByFixtureId = new Map<string, string>();
  for (const fixture of PROJECT_FIXTURES) {
    const [row] = await db
      .insert(projects)
      .values({
        name: fixture.name,
        description: fixture.description,
        userId: devUserId,
        createdAt: new Date(fixture.createdAt),
        updatedAt: new Date(fixture.updatedAt),
      })
      .returning({ id: projects.id });
    projectIdByFixtureId.set(fixture.id, row.id);
  }

  console.log("Seeding links...");
  for (const fixture of LINK_FIXTURES) {
    await db
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
        userId: devUserId,
        createdAt: new Date(fixture.createdAt),
        updatedAt: new Date(fixture.updatedAt),
        archivedAt: fixture.status === "archived" ? new Date(fixture.updatedAt) : null,
      });
  }

  console.log(
    `Seeded ${PROJECT_FIXTURES.length} projects, ${LINK_FIXTURES.length} links for ${DEV_USER_EMAIL}.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
