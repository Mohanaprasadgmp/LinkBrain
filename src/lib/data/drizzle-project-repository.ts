import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { projects as projectsTable } from "@/lib/db/schema";
import type { Project } from "@/lib/domain/types";
import { pickProjectAccent } from "@/lib/utils/project-accent";

import type { ProjectRepository } from "./repository";

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
  async list(): Promise<Project[]> {
    const rows = await getDb()
      .select()
      .from(projectsTable)
      .orderBy(projectsTable.name);
    return rows.map(rowToProject);
  }

  async get(id: string): Promise<Project | null> {
    const [row] = await getDb()
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, id))
      .limit(1);
    return row ? rowToProject(row) : null;
  }

  async create(input: { name: string; description?: string }): Promise<Project> {
    const [row] = await getDb()
      .insert(projectsTable)
      .values({ name: input.name, description: input.description ?? "" })
      .returning();
    return rowToProject(row);
  }

  async update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<Project | null> {
    const [row] = await getDb()
      .update(projectsTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(projectsTable.id, id))
      .returning();
    return row ? rowToProject(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(projectsTable)
      .where(eq(projectsTable.id, id))
      .returning({ id: projectsTable.id });
    return deleted.length > 0;
  }
}
