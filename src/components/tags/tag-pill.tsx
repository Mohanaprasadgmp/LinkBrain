import Link from "next/link";

import type { Tag } from "@/lib/domain/types";

/**
 * A single tag, linking into All Links pre-filtered by that tag.
 *
 * Uses the shared search query rather than a dedicated tag filter route,
 * since `searchLinks` already matches against tags — one query mechanism
 * covers both entry points instead of two parallel filtering paths.
 */
export function TagPill({ tag }: { tag: Tag }) {
  return (
    <Link
      href={`/links?q=${encodeURIComponent(tag.label)}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-raised transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <span className="truncate text-sm font-medium text-ink">
        #{tag.label}
      </span>
      <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-subtle tabular-nums">
        {tag.linkCount}
      </span>
    </Link>
  );
}
