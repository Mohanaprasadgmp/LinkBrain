"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, type NavItem } from "@/config/nav";
import type { SidebarCounts } from "@/lib/data";
import { cn } from "@/lib/utils/cn";

/**
 * The list of nav links, shared by the desktop sidebar and the mobile drawer.
 *
 * `badgeCounts` is fetched once per request by the workspace layout (see
 * `app/(workspace)/layout.tsx`) and threaded down as a plain prop, rather
 * than read from client state — Inbox/Favorites counts now live in Postgres,
 * not in a client store.
 */
export function SidebarNav({
  items,
  badgeCounts,
  onNavigate,
}: {
  items: NavItem[];
  badgeCounts: SidebarCounts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const counts: Record<string, number> = {
    inbox: badgeCounts.inbox,
    favorites: badgeCounts.favorites,
  };

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        const count = item.badge ? counts[item.badge] : undefined;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent/10 text-accent"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink",
            )}
          >
            <item.icon
              aria-hidden="true"
              className={cn(
                "size-4.5 shrink-0",
                active ? "text-accent" : "text-ink-subtle group-hover:text-ink",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums",
                  active
                    ? "bg-accent/15 text-accent"
                    : "bg-surface-sunken text-ink-subtle",
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
