import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { requireUserId } from "@/lib/auth/session";
import { getLinkRepository } from "@/lib/data";
import { STATUS_ORDER } from "@/lib/domain/status";
import { LINKS_PAGE_SIZE, stateToFilter, type LinkListQueryState } from "@/lib/links/query-state";

/** Every status except "archived" — see `link-collection-view.tsx`'s doc comment on this default. */
const ACTIVE_STATUSES = STATUS_ORDER.filter((status) => status !== "archived");

/**
 * Every link in the library. Defaults to excluding archived links (fixing a
 * pre-Phase-4 gap where this view had no status constraint at all and
 * archived links leaked in) unless the user explicitly filters by status —
 * including picking "Archived" itself, which then shows only archived links,
 * exactly like any other status choice.
 */
export async function AllLinksView({ queryState }: { queryState: LinkListQueryState }) {
  await connection();
  const userId = await requireUserId();

  const filter = stateToFilter(queryState);
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
      title="All Links"
      description="Your complete collection, searchable and filterable."
      links={links}
      totalCount={totalCount}
      emptyTitle="Your library is empty"
      emptyDescription="Save your first link using the Add Link button above."
    />
  );
}
