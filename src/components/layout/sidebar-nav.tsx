"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, type NavItem } from "@/config/nav";
import { cn } from "@/lib/utils/cn";
import { useLinkStore } from "@/store/link-store";

/**
 * The list of nav links, shared by the desktop sidebar and the mobile drawer.
 *
 * Badge counts are derived from the live store rather than stored on the nav
 * config, so Inbox/Favorites counts stay correct as links change without any
 * extra plumbing.
 */
export function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { links } = useLinkStore();

  const badgeCounts: Record<string, number> = {
    inbox: links.filter((link) => link.status === "saved").length,
    favorites: links.filter((link) => link.isFavorite).length,
  };

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        const count = item.badge ? badgeCounts[item.badge] : undefined;

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
