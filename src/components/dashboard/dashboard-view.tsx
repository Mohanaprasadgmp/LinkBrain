"use client";

import { Library } from "lucide-react";

import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { LinkList } from "@/components/links/link-list";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { deriveStats } from "@/lib/links/stats";
import { sortLinks } from "@/lib/links/sort";
import { useLinkStore } from "@/store/link-store";

const RECENT_COUNT = 6;

export function DashboardView() {
  const { links, projects } = useLinkStore();
  const stats = deriveStats(links, projects);
  const recent = sortLinks(links, "newest").slice(0, RECENT_COUNT);

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
