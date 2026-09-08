import { connection } from "next/server";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { getLinkRepository } from "@/lib/data";

export async function FavoritesView({ query }: { query: string }) {
  await connection();

  const links = await getLinkRepository().list({
    isFavorite: true,
    query: query || undefined,
  });

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Favorites"
      description="Links you've marked as important enough to find quickly."
      baseLinks={links}
      emptyIcon="star"
      emptyTitle="No favorites yet"
      emptyDescription="Star a link from its actions menu to pin it here."
    />
  );
}
