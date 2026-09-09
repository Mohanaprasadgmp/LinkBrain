import type { Metadata } from "next";
import { Suspense } from "react";

import { AllLinksView } from "@/components/links/all-links-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";
import { parseLinkListSearchParams } from "@/lib/links/query-state";

export const metadata: Metadata = { title: "All Links" };

export default async function AllLinksPage({ searchParams }: PageProps<"/links">) {
  const queryState = parseLinkListSearchParams(await searchParams);

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <AllLinksView queryState={queryState} />
    </Suspense>
  );
}
