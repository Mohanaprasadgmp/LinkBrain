import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { getLinkRepository } from "@/lib/data";

/** Every link in the library, regardless of status. */
export async function AllLinksView({ query }: { query: string }) {
  await connection();

  const links = await getLinkRepository().list({ query: query || undefined });

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="All Links"
      description="Your complete collection, searchable and filterable."
      baseLinks={links}
      emptyTitle="Your library is empty"
      emptyDescription="Save your first link using the Add Link button above."
    />
  );
}
