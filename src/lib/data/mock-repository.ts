import { LINK_FIXTURES } from "@/lib/data/fixtures/links";
import { PROJECT_FIXTURES } from "@/lib/data/fixtures/projects";
import type {
  BulkLinkAction,
  Link,
  LinkFilter,
  LinkUpdate,
  NewLinkInput,
  Project,
} from "@/lib/domain/types";
import { filterLinks } from "@/lib/links/filters";
import { sortLinks } from "@/lib/links/sort";
import { pickProjectAccent } from "@/lib/utils/project-accent";
import { extractDomain, normalizeUrl, titleFromUrl } from "@/lib/utils/url";

import type {
  LinkListOptions,
  LinkRepository,
  ProjectRepository,
  UserScopedLinkRepository,
  UserScopedProjectRepository,
} from "./repository";

/** All the fixture data is seeded under this id — see each mock repository's `forUser()`. */
const FIXTURE_OWNER_ID = "dev-user";

type OwnedLink = Link & { userId: string };
type OwnedProject = Project & { userId: string };

/**
 * In-memory implementation of `LinkRepository`, backed by the fixtures.
 *
 * Holds its own mutable copy of the fixtures rather than the fixtures array
 * itself, so repeated create/update/delete calls (from a future server action,
 * for instance) don't corrupt the original seed data. Filtering/sorting/
 * pagination compose the same pure `filterLinks`/`sortLinks` helpers the
 * (pre-Phase-4) client UI used to call directly, so this stays a correct
 * reference implementation of the `LinkRepository` contract even though
 * nothing in production constructs it (see `lib/data/index.ts`). All fixture
 * rows are owned by `FIXTURE_OWNER_ID`; `forUser()` with any other id starts
 * from an empty, fully isolated view — the same shape real per-user
 * isolation takes in the Postgres-backed repository.
 *
 * `links` is intentionally not `private`: the scoped repository classes
 * below read and write it directly (same module, same "one mutable store
 * shared by every `forUser()` view" design as the Drizzle repositories share
 * one database) rather than going through an accessor built only to satisfy
 * TypeScript's privacy check.
 */
export class MockLinkRepository implements LinkRepository {
  links: OwnedLink[] = LINK_FIXTURES.map((link) => ({ ...link, userId: FIXTURE_OWNER_ID }));

  forUser(userId: string): UserScopedLinkRepository {
    return new UserScopedMockLinkRepository(this, userId);
  }
}

class UserScopedMockLinkRepository implements UserScopedLinkRepository {
  constructor(
    private readonly store: MockLinkRepository,
    private readonly userId: string,
  ) {}

  private mine(): Link[] {
    return this.store.links.filter((link) => link.userId === this.userId);
  }

  async list(filter: LinkFilter = {}, options: LinkListOptions = {}): Promise<Link[]> {
    const sorted = sortLinks(filterLinks(this.mine(), filter), options.sort ?? "newest");
    const offset = options.offset ?? 0;
    return options.limit !== undefined
      ? sorted.slice(offset, offset + options.limit)
      : sorted.slice(offset);
  }

  async count(filter: LinkFilter = {}): Promise<number> {
    return filterLinks(this.mine(), filter).length;
  }

  async get(id: string): Promise<Link | null> {
    return this.mine().find((link) => link.id === id) ?? null;
  }

  async findByUrl(url: string): Promise<Link | null> {
    return this.mine().find((link) => link.url === url) ?? null;
  }

  async create(input: NewLinkInput): Promise<Link> {
    const url = normalizeUrl(input.url) ?? input.url;
    const now = new Date().toISOString();

    const link: OwnedLink = {
      id: `link-${crypto.randomUUID()}`,
      url,
      domain: extractDomain(url),
      title: input.title.trim() || titleFromUrl(url),
      description: input.description?.trim() ?? "",
      note: input.note?.trim() ?? "",
      status: input.status ?? "saved",
      priority: input.priority ?? "useful",
      isFavorite: input.isFavorite ?? false,
      projectId: input.projectId ?? null,
      favicon: null,
      previewImage: null,
      createdAt: now,
      updatedAt: now,
      userId: this.userId,
    };

    this.store.links = [link, ...this.store.links];
    return link;
  }

  async update(id: string, patch: LinkUpdate): Promise<Link | null> {
    let updated: Link | null = null;

    this.store.links = this.store.links.map((link) => {
      if (link.id !== id || link.userId !== this.userId) return link;
      const next = { ...link, ...patch, updatedAt: new Date().toISOString() };
      updated = next;
      return next;
    });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.store.links.length;
    this.store.links = this.store.links.filter(
      (link) => !(link.id === id && link.userId === this.userId),
    );
    return this.store.links.length < before;
  }

  async bulkApply(ids: string[], action: BulkLinkAction): Promise<number> {
    const idSet = new Set(ids);
    const isMine = (link: OwnedLink) => idSet.has(link.id) && link.userId === this.userId;

    if (action.type === "delete") {
      const before = this.store.links.length;
      this.store.links = this.store.links.filter((link) => !isMine(link));
      return before - this.store.links.length;
    }

    const now = new Date().toISOString();
    let affected = 0;

    this.store.links = this.store.links.map((link) => {
      if (!isMine(link)) return link;
      affected++;

      switch (action.type) {
        case "status":
          return { ...link, status: action.status, updatedAt: now };
        case "archive":
          return { ...link, status: "archived" as const, updatedAt: now };
        case "priority":
          return { ...link, priority: action.priority, updatedAt: now };
        case "project":
          return { ...link, projectId: action.projectId, updatedAt: now };
        case "favorite":
          return { ...link, isFavorite: action.value, updatedAt: now };
        default:
          return link;
      }
    });

    return affected;
  }
}

export class MockProjectRepository implements ProjectRepository {
  projects: OwnedProject[] = PROJECT_FIXTURES.map((project) => ({
    ...project,
    userId: FIXTURE_OWNER_ID,
  }));

  forUser(userId: string): UserScopedProjectRepository {
    return new UserScopedMockProjectRepository(this, userId);
  }
}

class UserScopedMockProjectRepository implements UserScopedProjectRepository {
  constructor(
    private readonly store: MockProjectRepository,
    private readonly userId: string,
  ) {}

  async list(): Promise<Project[]> {
    return this.store.projects.filter((project) => project.userId === this.userId);
  }

  async get(id: string): Promise<Project | null> {
    return this.store.projects.find((p) => p.id === id && p.userId === this.userId) ?? null;
  }

  async create(input: { name: string; description?: string }): Promise<Project> {
    const now = new Date().toISOString();
    const project: OwnedProject = {
      id: `proj-${crypto.randomUUID()}`,
      name: input.name,
      description: input.description ?? "",
      accent: pickProjectAccent(input.name),
      createdAt: now,
      updatedAt: now,
      userId: this.userId,
    };
    this.store.projects = [...this.store.projects, project];
    return project;
  }

  async update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<Project | null> {
    let updated: Project | null = null;

    this.store.projects = this.store.projects.map((project) => {
      if (project.id !== id || project.userId !== this.userId) return project;
      const next = { ...project, ...patch, updatedAt: new Date().toISOString() };
      updated = next;
      return next;
    });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.store.projects.length;
    this.store.projects = this.store.projects.filter(
      (p) => !(p.id === id && p.userId === this.userId),
    );
    return this.store.projects.length < before;
  }
}
