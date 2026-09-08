import type { Metadata } from "next";
import { Suspense } from "react";

import { ArchiveView } from "@/components/links/archive-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage({ searchParams }: PageProps<"/archive">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <ArchiveView query={query} />
    </Suspense>
  );
}
