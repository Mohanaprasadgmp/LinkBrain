import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { ProjectDetailActions } from "@/components/projects/project-detail-actions";
import { requireUserId } from "@/lib/auth/session";
import { getLinkRepository, getProjectLinkStats, getProjectRepository } from "@/lib/data";
import { LINKS_PAGE_SIZE, stateToFilter, type LinkListQueryState } from "@/lib/links/query-state";

/**
 * A single project's links — reuses `LinkCollectionView` the same way
 * `ArchiveView`/`FavoritesView` do for their own structural constraint, here
 * scoped to `projectId`. The project picker in the filter bar is hidden
 * (`hideProjectFilter`) since there's only one project in scope.
 */
export async function ProjectDetailView({
  id,
  queryState,
}: {
  id: string;
  queryState: LinkListQueryState;
}) {
  await connection();
  const userId = await requireUserId();

  const project = await getProjectRepository().forUser(userId).get(id);
  if (!project) notFound();

  const filter = { ...stateToFilter(queryState), projectId: id };
  const linkRepo = getLinkRepository().forUser(userId);
  const offset = (queryState.page - 1) * LINKS_PAGE_SIZE;

  const [links, totalCount, stats] = await Promise.all([
    linkRepo.list(filter, { sort: queryState.sort, limit: LINKS_PAGE_SIZE, offset }),
    linkRepo.count(filter),
    getProjectLinkStats(userId),
  ]);

  const linkCount = stats[project.id]?.count ?? 0;

  return (
    <LinkCollectionView
      eyebrow="Project"
      title={project.name}
      description={
        project.description ||
        `${linkCount} ${linkCount === 1 ? "link" : "links"} in this project.`
      }
      links={links}
      totalCount={totalCount}
      emptyTitle="No links in this project yet"
      emptyDescription={`Assign a link to "${project.name}" from its edit menu.`}
      hideProjectFilter
      headerAction={<ProjectDetailActions project={project} />}
    />
  );
}
