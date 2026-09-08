import type { Metadata } from "next";
import { Suspense } from "react";

import { InboxView } from "@/components/links/inbox-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <InboxView query={query} />
    </Suspense>
  );
}
