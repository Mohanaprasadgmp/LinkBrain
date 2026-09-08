import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { getLinkRepository } from "@/lib/data";

export async function ArchiveView({ query }: { query: string }) {
  await connection();

  const links = await getLinkRepository().list({
    status: ["archived"],
    query: query || undefined,
  });

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Archive"
      description="Links you've put away but kept around for reference."
      baseLinks={links}
      emptyIcon="archive"
      emptyTitle="Nothing archived"
      emptyDescription="Archive a link from its actions menu to move it out of your active lists."
      hideStatusFilter
    />
  );
}
