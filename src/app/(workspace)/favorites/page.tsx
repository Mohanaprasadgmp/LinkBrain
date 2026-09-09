import type { Metadata } from "next";
import { Suspense } from "react";

import { FavoritesView } from "@/components/links/favorites-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";
import { parseLinkListSearchParams } from "@/lib/links/query-state";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage({
  searchParams,
}: PageProps<"/favorites">) {
  const queryState = parseLinkListSearchParams(await searchParams);

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <FavoritesView queryState={queryState} />
    </Suspense>
  );
}
