import "server-only";

import { DrizzleLinkRepository } from "./drizzle-link-repository";
import { DrizzleProjectRepository } from "./drizzle-project-repository";
import type { LinkRepository, ProjectRepository } from "./repository";

/**
 * The one place a future backend swap would touch: everything else in the
 * app calls these factories rather than constructing a repository directly.
 */
let linkRepository: LinkRepository | undefined;
let projectRepository: ProjectRepository | undefined;

export function getLinkRepository(): LinkRepository {
  return (linkRepository ??= new DrizzleLinkRepository());
}

export function getProjectRepository(): ProjectRepository {
  return (projectRepository ??= new DrizzleProjectRepository());
}

export {
  getProjectLinkStats,
  getSidebarCounts,
  listTagsWithCounts,
  type ProjectLinkStats,
  type SidebarCounts,
} from "./drizzle-link-repository";
