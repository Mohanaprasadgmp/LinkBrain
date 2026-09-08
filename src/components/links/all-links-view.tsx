"use client";

import { useState } from "react";

import { AddLinkDialog } from "@/components/links/add-link-dialog";
import { LinkCollectionView } from "@/components/links/link-collection-view";
import { useLinkStore } from "@/store/link-store";

/** Every link in the library, regardless of status. */
export function AllLinksView() {
  const { links } = useLinkStore();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <LinkCollectionView
        eyebrow="Library"
        title="All Links"
        description="Your complete collection, searchable and filterable."
        baseLinks={links}
        emptyTitle="Your library is empty"
        emptyDescription="Save your first link to start building your library."
        onAddLink={() => setAddOpen(true)}
      />
      <AddLinkDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
