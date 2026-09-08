import type { Metadata } from "next";
import { Suspense } from "react";

import { FavoritesView } from "@/components/links/favorites-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage({
  searchParams,
}: PageProps<"/favorites">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <FavoritesView query={query} />
    </Suspense>
  );
}
