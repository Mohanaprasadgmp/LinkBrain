import type { Metadata } from "next";
import { Suspense } from "react";

import { ArchiveView } from "@/components/links/archive-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";
import { parseLinkListSearchParams } from "@/lib/links/query-state";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage({ searchParams }: PageProps<"/archive">) {
  const queryState = parseLinkListSearchParams(await searchParams);

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <ArchiveView queryState={queryState} />
    </Suspense>
  );
}
