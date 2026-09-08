"use client";

import { Archive } from "lucide-react";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { useLinkStore } from "@/store/link-store";

export function ArchiveView() {
  const { links } = useLinkStore();
  const baseLinks = links.filter((link) => link.status === "archived");

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Archive"
      description="Links you've put away but kept around for reference."
      baseLinks={baseLinks}
      emptyIcon={Archive}
      emptyTitle="Nothing archived"
      emptyDescription="Archive a link from its actions menu to move it out of your active lists."
      hideStatusFilter
    />
  );
}
