import type { Metadata } from "next";
import { Suspense } from "react";

import { AllLinksView } from "@/components/links/all-links-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "All Links" };

export default function AllLinksPage() {
  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <AllLinksView />
    </Suspense>
  );
}
