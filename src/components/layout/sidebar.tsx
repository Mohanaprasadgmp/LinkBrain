"use client";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/config/nav";
import type { SidebarCounts } from "@/lib/data";

/**
 * The persistent desktop sidebar.
 *
 * Hidden below `lg`, where `MobileNav` takes over via an off-canvas drawer —
 * see `AppShell` for the breakpoint split.
 *
 * Marked "use client": `PRIMARY_NAV`/`SECONDARY_NAV` carry Lucide icon
 * component references, which can't be passed as props across the
 * Server-to-Client boundary (they aren't serializable). Rendering this
 * component entirely on the client — matching `MobileNav`, which already
 * imports the same nav config directly — avoids that boundary crossing rather
 * than working around it. `badgeCounts` (plain numbers) crosses that boundary
 * fine as a prop from the server layout above it.
 */
export function Sidebar({ badgeCounts }: { badgeCounts: SidebarCounts }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="px-4 py-5">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <SidebarNav items={PRIMARY_NAV} badgeCounts={badgeCounts} />
      </div>

      <div className="border-t border-border px-3 py-3">
        <SidebarNav items={SECONDARY_NAV} badgeCounts={badgeCounts} />
        <div className="mt-2">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
