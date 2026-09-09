import "server-only";

import { DrizzleAiInsightRepository } from "./drizzle-ai-insight-repository";
import { DrizzleLinkRepository } from "./drizzle-link-repository";
import { DrizzleProjectRepository } from "./drizzle-project-repository";
import type { AiInsightRepository, LinkRepository, ProjectRepository } from "./repository";

/**
 * The one place a future backend swap would touch: everything else in the
 * app calls these factories rather than constructing a repository directly.
 */
let linkRepository: LinkRepository | undefined;
let projectRepository: ProjectRepository | undefined;
let aiInsightRepository: AiInsightRepository | undefined;

export function getLinkRepository(): LinkRepository {
  return (linkRepository ??= new DrizzleLinkRepository());
}

export function getProjectRepository(): ProjectRepository {
  return (projectRepository ??= new DrizzleProjectRepository());
}

export function getAiInsightRepository(): AiInsightRepository {
  return (aiInsightRepository ??= new DrizzleAiInsightRepository());
}

export {
  getLibraryStats,
  getProjectLinkStats,
  getSidebarCounts,
  type ProjectLinkStats,
  type SidebarCounts,
} from "./drizzle-link-repository";
