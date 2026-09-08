import type { Metadata } from "next";
import { Suspense } from "react";

import { ArchiveView } from "@/components/links/archive-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Archive" };

export default function ArchivePage() {
  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <ArchiveView />
    </Suspense>
  );
}
