import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { requireUserId } from "@/lib/auth/session";
import { getLinkRepository } from "@/lib/data";
import type { LinkStatus } from "@/lib/domain/types";
import { LINKS_PAGE_SIZE, stateToFilter, type LinkListQueryState } from "@/lib/links/query-state";

export async function ArchiveView({ queryState }: { queryState: LinkListQueryState }) {
  await connection();
  const userId = await requireUserId();

  // Always archived-only, regardless of what a status filter param might
  // claim — the UI never offers a status control here (`hideStatusFilter`).
  const filter = { ...stateToFilter(queryState), status: ["archived"] satisfies LinkStatus[] };

  const linkRepo = getLinkRepository().forUser(userId);
  const offset = (queryState.page - 1) * LINKS_PAGE_SIZE;
  const [links, totalCount] = await Promise.all([
    linkRepo.list(filter, { sort: queryState.sort, limit: LINKS_PAGE_SIZE, offset }),
    linkRepo.count(filter),
  ]);

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Archive"
      description="Links you've put away but kept around for reference."
      links={links}
      totalCount={totalCount}
      emptyIcon="archive"
      emptyTitle="Nothing archived"
      emptyDescription="Archive a link from its actions menu to move it out of your active lists."
      hideStatusFilter
    />
  );
}
