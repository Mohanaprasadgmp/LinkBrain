import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { requireUserId } from "@/lib/auth/session";
import { getLinkRepository } from "@/lib/data";
import { STATUS_ORDER } from "@/lib/domain/status";
import { LINKS_PAGE_SIZE, stateToFilter, type LinkListQueryState } from "@/lib/links/query-state";

const ACTIVE_STATUSES = STATUS_ORDER.filter((status) => status !== "archived");

export async function FavoritesView({ queryState }: { queryState: LinkListQueryState }) {
  await connection();
  const userId = await requireUserId();

  const filter = stateToFilter(queryState);
  filter.isFavorite = true;
  if (!filter.status?.length) {
    filter.status = ACTIVE_STATUSES;
  }

  const linkRepo = getLinkRepository().forUser(userId);
  const offset = (queryState.page - 1) * LINKS_PAGE_SIZE;
  const [links, totalCount] = await Promise.all([
    linkRepo.list(filter, { sort: queryState.sort, limit: LINKS_PAGE_SIZE, offset }),
    linkRepo.count(filter),
  ]);

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Favorites"
      description="Links you've marked as important enough to find quickly."
      links={links}
      totalCount={totalCount}
      emptyIcon="star"
      emptyTitle="No favorites yet"
      emptyDescription="Star a link from its actions menu to pin it here."
      hideFavoriteFilter
    />
  );
}
