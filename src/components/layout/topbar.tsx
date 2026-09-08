"use client";

import { Plus } from "lucide-react";
import { Suspense, useState } from "react";

import { AddLinkDialog } from "@/components/links/add-link-dialog";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/search/global-search";
import { ThemeQuickToggle } from "@/components/theme/theme-quick-toggle";
import { Button } from "@/components/ui/button";
import type { SidebarCounts } from "@/lib/data";

/**
 * The bar above every page: menu toggle (mobile), global search, and the
 * primary Add Link action. Persistent across routes so saving a link never
 * requires navigating away from whatever the user is looking at.
 *
 * `GlobalSearch` calls `useSearchParams` indirectly via `next/navigation`
 * hooks, which per the Next.js 16 docs requires a `<Suspense>` boundary around
 * any consumer or `next build` fails with a "Missing Suspense boundary" error.
 */
export function Topbar({ badgeCounts }: { badgeCounts: SidebarCounts }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
      <MobileNav badgeCounts={badgeCounts} />

      <Suspense fallback={<div className="h-9 w-full max-w-sm" />}>
        <GlobalSearch />
      </Suspense>

      <div className="ml-auto flex items-center gap-2">
        <ThemeQuickToggle />
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Add Link</span>
        </Button>
      </div>

      <AddLinkDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </header>
  );
}
