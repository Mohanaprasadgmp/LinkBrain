"use client";

import { Inbox } from "lucide-react";

import { LinkCollectionView } from "@/components/links/link-collection-view";
import { UNREAD_STATUSES } from "@/lib/domain/status";
import { useLinkStore } from "@/store/link-store";

/** Links still waiting to be read: status `saved` or `reading`. */
export function InboxView() {
  const { links } = useLinkStore();
  const baseLinks = links.filter((link) => UNREAD_STATUSES.includes(link.status));

  return (
    <LinkCollectionView
      eyebrow="Library"
      title="Inbox"
      description="Everything you've saved that you haven't finished reading yet."
      baseLinks={baseLinks}
      emptyIcon={Inbox}
      emptyTitle="Inbox zero"
      emptyDescription="Nothing waiting to be read. Save a link to see it here."
    />
  );
}
