import { isUnread } from "@/lib/domain/status";
import type { LibraryStats, Link, Project } from "@/lib/domain/types";

/**
 * Derive the dashboard summary counts from the current links and projects.
 *
 * Kept as a single pure function so the dashboard cards never disagree with the
 * lists below them: both read from the same source array.
 */
export function deriveStats(links: Link[], projects: Project[]): LibraryStats {
  // Archived links are excluded from the headline total: the total is meant to
  // read as "what is in my library right now", and Archive has its own view.
  const active = links.filter((link) => link.status !== "archived");

  return {
    totalLinks: active.length,
    unread: active.filter((link) => isUnread(link.status)).length,
    favorites: active.filter((link) => link.isFavorite).length,
    projects: projects.length,
  };
}

/** Count how many links belong to each project, keyed by project id. */
export function countLinksByProject(links: Link[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const link of links) {
    if (!link.projectId) continue;
    counts[link.projectId] = (counts[link.projectId] ?? 0) + 1;
  }

  return counts;
}

/**
 * The most recent timestamp among a project's links, falling back to the
 * project's own `updatedAt` when it has no links yet.
 */
export function lastActivityByProject(
  links: Link[],
  projects: Project[],
): Record<string, string> {
  const latest: Record<string, string> = {};

  for (const project of projects) {
    latest[project.id] = project.updatedAt;
  }

  for (const link of links) {
    if (!link.projectId) continue;
    const current = latest[link.projectId];
    if (!current || new Date(link.updatedAt) > new Date(current)) {
      latest[link.projectId] = link.updatedAt;
    }
  }

  return latest;
}
