import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { LinkCollectionSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<LinkCollectionSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}
