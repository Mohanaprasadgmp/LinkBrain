import type { Metadata } from "next";
import { Suspense } from "react";

import { LinkDetailView } from "@/components/links/link-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Link" };

export default async function LinkDetailPage({ params }: PageProps<"/links/[id]">) {
  const { id } = await params;

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <LinkDetailView id={id} />
    </Suspense>
  );
}
