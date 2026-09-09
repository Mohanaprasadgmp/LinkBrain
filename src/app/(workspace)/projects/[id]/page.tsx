import type { Metadata } from "next";
import { Suspense } from "react";

import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";
import { parseLinkListSearchParams } from "@/lib/links/query-state";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const queryState = parseLinkListSearchParams(await searchParams);

  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <ProjectDetailView id={id} queryState={queryState} />
    </Suspense>
  );
}
