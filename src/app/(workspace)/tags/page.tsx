import type { Metadata } from "next";
import { Suspense } from "react";

import { TagsView } from "@/components/tags/tags-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <TagsView />
    </Suspense>
  );
}
