import type {
  Link,
  LinkFilter,
  LinkUpdate,
  NewLinkInput,
  Project,
} from "@/lib/domain/types";

/**
 * Data access interfaces.
 *
 * This is the contract the backend satisfies. `DrizzleLinkRepository` /
 * `DrizzleProjectRepository` (in this same directory) implement these methods
 * against Postgres; nothing that depends on these interfaces needs to change
 * if the backend is ever swapped again — only `lib/data/index.ts` is edited
 * to construct a different implementation.
 *
 * Methods are `async` so code written against this interface is already
 * correct for a network-backed implementation (which it now is).
 */
export interface LinkRepository {
  /**
   * `filter` narrows the result set at the database level — status,
   * priority, project, favourite, and free-text `query` (matched against
   * title/description/domain/tags). Omitting it returns everything.
   */
  list(filter?: LinkFilter): Promise<Link[]>;
  get(id: string): Promise<Link | null>;
  create(input: NewLinkInput): Promise<Link>;
  update(id: string, patch: LinkUpdate): Promise<Link | null>;
  delete(id: string): Promise<boolean>;
}

export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(input: { name: string; description?: string }): Promise<Project>;
  update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}
