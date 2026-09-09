"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { IconButton } from "@/components/ui/button";
import { PRIMARY_NAV } from "@/config/nav";
import type { SessionUser } from "@/lib/auth/session";
import type { SidebarCounts } from "@/lib/data";
import { cn } from "@/lib/utils/cn";

const COLLAPSED_STORAGE_KEY = "linkbrain.sidebar-collapsed";

// The collapsed/expanded preference lives in `localStorage`, outside React —
// read via `useSyncExternalStore` (matching `ThemeProvider`'s pattern) rather
// than "read once in a mount effect and setState," which renders the wrong
// value first and corrects it a beat later, exactly what
// `react-hooks/set-state-in-effect` flags.
const collapsedListeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(value));
  } catch {
    // A preference that doesn't persist is better than a crash.
  }
  collapsedListeners.forEach((listener) => listener());
}

function subscribeToCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  return () => collapsedListeners.delete(listener);
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

/**
 * The persistent desktop sidebar.
 *
 * Hidden below `lg`, where `MobileNav` takes over via an off-canvas drawer —
 * see `AppShell` for the breakpoint split. Collapsing to icons-only doesn't
 * apply there: the drawer is an overlay the user dismisses outright, not a
 * permanent strip competing for screen width the way the desktop sidebar is.
 *
 * Marked "use client": `PRIMARY_NAV` carries Lucide icon component
 * references, which can't be passed as props across the Server-to-Client
 * boundary (they aren't serializable). Rendering this component entirely on
 * the client — matching `MobileNav`, which already imports the same nav
 * config directly — avoids that boundary crossing rather than working around
 * it. `badgeCounts` (plain numbers) crosses that boundary fine as a prop from
 * the server layout above it.
 */
export function Sidebar({
  badgeCounts,
  user,
}: {
  badgeCounts: SidebarCounts;
  user: SessionUser;
}) {
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    readCollapsed,
    getCollapsedServerSnapshot,
  );

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center px-4 py-5",
          collapsed ? "flex-col gap-3" : "justify-between",
        )}
      >
        <Logo showWordmark={!collapsed} />
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          size="sm"
          onClick={() => writeCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-4" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4" />
          )}
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <SidebarNav items={PRIMARY_NAV} badgeCounts={badgeCounts} collapsed={collapsed} />
      </div>

      <div className="border-t border-border px-3 py-3">
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </aside>
  );
}
