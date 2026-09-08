import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { getLinkRepository } from "@/lib/data";
import { UNREAD_STATUSES } from "@/lib/domain/status";

/** Links still waiting to be read: status `saved` or `reading`. */
export async function InboxView({ query }: { query: string }) {
  await connection();

  const links = await getLinkRepository().list({
    status: UNREAD_STATUSES,
    query: query || undefined,
  });

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Inbox"
      description="Everything you've saved that you haven't finished reading yet."
      baseLinks={links}
      emptyIcon="inbox"
      emptyTitle="Inbox zero"
      emptyDescription="Nothing waiting to be read. Save a link to see it here."
    />
  );
}
