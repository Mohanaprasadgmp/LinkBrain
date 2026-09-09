import { Library } from "lucide-react";
import { connection } from "next/server";

import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { LinkList } from "@/components/links/link-list";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { requireUser } from "@/lib/auth/session";
import { getLibraryStats, getLinkRepository } from "@/lib/data";

const RECENT_COUNT = 6;

/**
 * The dashboard's data-fetching half.
 *
 * An async Server Component: it awaits the repository directly rather than
 * going through `useLinkStore()`, and hands the already-fetched arrays down
 * to the same child components Phase 1 used. Stats come from `getLibraryStats`
 * (a SQL aggregate) and "Recently saved" from a limited, sorted `list()` call
 * — neither fetches the whole library into memory the way this view used to,
 * which mattered only for stats/recents, not for anything a user directly
 * paginates through.
 */
export async function DashboardView() {
  // Opts this route out of static generation — see lib/db/index.ts's doc
  // comment for why this (rather than `export const dynamic`) is how a
  // genuinely per-request page declares itself dynamic in Next.js 16.
  await connection();
  const user = await requireUser();

  const [stats, recent] = await Promise.all([
    getLibraryStats(user.id),
    getLinkRepository().forUser(user.id).list(undefined, { sort: "newest", limit: RECENT_COUNT }),
  ]);

  return (
    <div className="space-y-8">
      <GreetingHeader name={user.name} />

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
