import type { Metadata } from "next";
import { Suspense } from "react";

import { InboxView } from "@/components/links/inbox-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";
import { parseLinkListSearchParams } from "@/lib/links/query-state";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const queryState = parseLinkListSearchParams(await searchParams);

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <InboxView queryState={queryState} />
    </Suspense>
  );
}
