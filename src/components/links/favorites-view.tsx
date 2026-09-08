"use client";

import { Star } from "lucide-react";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { useLinkStore } from "@/store/link-store";

export function FavoritesView() {
  const { links } = useLinkStore();
  const baseLinks = links.filter((link) => link.isFavorite);

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Favorites"
      description="Links you've marked as important enough to find quickly."
      baseLinks={baseLinks}
      emptyIcon={Star}
      emptyTitle="No favorites yet"
      emptyDescription="Star a link from its actions menu to pin it here."
    />
  );
}
