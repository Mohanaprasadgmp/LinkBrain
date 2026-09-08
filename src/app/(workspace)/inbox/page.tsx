import type { Metadata } from "next";
import { Suspense } from "react";

import { InboxView } from "@/components/links/inbox-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <InboxView />
    </Suspense>
  );
}
