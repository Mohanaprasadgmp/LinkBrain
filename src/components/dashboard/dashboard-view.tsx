import { Library } from "lucide-react";
import { connection } from "next/server";

import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { LinkList } from "@/components/links/link-list";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { getLinkRepository, getProjectRepository } from "@/lib/data";
import { deriveStats } from "@/lib/links/stats";

const RECENT_COUNT = 6;

/**
 * The dashboard's data-fetching half.
 *
 * An async Server Component: it awaits the repository directly rather than
 * going through `useLinkStore()`, and hands the already-fetched arrays down
 * to the same child components Phase 1 used. `list()` already orders newest
 * first (see `DrizzleLinkRepository`), so the "Recently saved" slice is just
 * the first few rows — no separate query.
 */
export async function DashboardView() {
  // Opts this route out of static generation — see lib/db/index.ts's doc
  // comment for why this (rather than `export const dynamic`) is how a
  // genuinely per-request page declares itself dynamic in Next.js 16.
  await connection();

  const [links, projects] = await Promise.all([
    getLinkRepository().list(),
    getProjectRepository().list(),
  ]);

  const stats = deriveStats(links, projects);
  const recent = links.slice(0, RECENT_COUNT);

  return (
    <div className="space-y-8">
      <GreetingHeader />

      <SummaryCards stats={stats} />

      <div className="space-y-4">
        <SectionHeading
          eyebrow="Library"
          title="Recently saved"
          description="The latest links you've added, newest first."
        />

        <LinkList
          links={recent}
          emptyState={
            <EmptyState
              icon={Library}
              title="Your library is empty"
              description="Save your first link with the Add Link button above."
            />
          }
        />
      </div>
    </div>
  );
}
