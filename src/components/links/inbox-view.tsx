import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { requireUserId } from "@/lib/auth/session";
import { getLinkRepository } from "@/lib/data";
import { UNREAD_STATUSES } from "@/lib/domain/status";
import { LINKS_PAGE_SIZE, stateToFilter, type LinkListQueryState } from "@/lib/links/query-state";

/**
 * Links still waiting to be read: status `saved` or `reading`.
 *
 * An explicit status filter narrows *within* that structural set (picking
 * "Read" here shows nothing, matching the intersection semantics this page
 * has always had) rather than replacing it — Inbox is never a way to
 * reach `read`/`archived` links, whatever the filter UI is asked for.
 */
export async function InboxView({ queryState }: { queryState: LinkListQueryState }) {
  await connection();
  const userId = await requireUserId();

  const effectiveStatus = queryState.status.length
    ? queryState.status.filter((status) => UNREAD_STATUSES.includes(status))
    : UNREAD_STATUSES;

  if (effectiveStatus.length === 0) {
    return (
      <LinkCollectionView
        eyebrow="Library"
        title="Inbox"
        description="Everything you've saved that you haven't finished reading yet."
        links={[]}
        totalCount={0}
        emptyIcon="inbox"
        emptyTitle="Inbox zero"
        emptyDescription="Nothing waiting to be read. Save a link to see it here."
      />
    );
  }

  const filter = { ...stateToFilter(queryState), status: effectiveStatus };
  const linkRepo = getLinkRepository().forUser(userId);
  const offset = (queryState.page - 1) * LINKS_PAGE_SIZE;

  const [links, totalCount] = await Promise.all([
    linkRepo.list(filter, { sort: queryState.sort, limit: LINKS_PAGE_SIZE, offset }),
    linkRepo.count(filter),
  ]);

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Inbox"
      description="Everything you've saved that you haven't finished reading yet."
      links={links}
      totalCount={totalCount}
      emptyIcon="inbox"
      emptyTitle="Inbox zero"
      emptyDescription="Nothing waiting to be read. Save a link to see it here."
    />
  );
}
