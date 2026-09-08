import type { Metadata } from "next";
import { Suspense } from "react";

import { FavoritesView } from "@/components/links/favorites-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <FavoritesView />
    </Suspense>
  );
}
