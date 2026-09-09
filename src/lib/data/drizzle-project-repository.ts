import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { projects as projectsTable } from "@/lib/db/schema";
import type { Project } from "@/lib/domain/types";
import { pickProjectAccent } from "@/lib/utils/project-accent";

import type { ProjectRepository, UserScopedProjectRepository } from "./repository";

type ProjectRow = typeof projectsTable.$inferSelect;

/**
 * Maps a database row to the domain `Project` type.
 *
 * This is the only place a raw Drizzle row becomes a `Project` — nothing
 * outside `lib/data` ever sees `ProjectRow` directly, which is what keeps the
 * database's column shape from leaking into components.
 */
function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    accent: pickProjectAccent(row.id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleProjectRepository implements ProjectRepository {
  forUser(userId: string): UserScopedProjectRepository {
    return new UserScopedDrizzleProjectRepository(userId);
  }
}

/** Every query below is scoped to `userId` — see `repository.ts`'s doc comment on why. */
class UserScopedDrizzleProjectRepository implements UserScopedProjectRepository {
  constructor(private readonly userId: string) {}

  async list(): Promise<Project[]> {
    const rows = await getDb()
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, this.userId))
      .orderBy(projectsTable.name);
    return rows.map(rowToProject);
  }

  async get(id: string): Promise<Project | null> {
    const [row] = await getDb()
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, this.userId)))
      .limit(1);
    return row ? rowToProject(row) : null;
  }

  async create(input: { name: string; description?: string }): Promise<Project> {
    const [row] = await getDb()
      .insert(projectsTable)
      .values({ name: input.name, description: input.description ?? "", userId: this.userId })
      .returning();
    return rowToProject(row);
  }

  async update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<Project | null> {
    // The database's own clock, not the app server's — see
    // `DrizzleLinkRepository.update()`'s identical choice for why mixing the
    // two (`createdAt`'s `defaultNow()` vs. an app-side `new Date()` here)
    // can silently misorder "recently updated" whenever the two clocks drift.
    const [row] = await getDb()
      .update(projectsTable)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, this.userId)))
      .returning();
    return row ? rowToProject(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, this.userId)))
      .returning({ id: projectsTable.id });
    return deleted.length > 0;
  }
}
