import type { Metadata } from "next";
import { Suspense } from "react";

import { AllLinksView } from "@/components/links/all-links-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "All Links" };

export default async function AllLinksPage({ searchParams }: PageProps<"/links">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <AllLinksView query={query} />
    </Suspense>
  );
}
