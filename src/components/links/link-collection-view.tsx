"use client";

import { Inbox as InboxIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { LinkFilters } from "@/components/links/link-filters";
import { LinkList } from "@/components/links/link-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { SearchInput } from "@/components/search/search-input";
import type { Link, LinkSort, LinkStatus, Priority } from "@/lib/domain/types";
import { filterLinks, isFilterActive } from "@/lib/links/filters";
import { sortLinks } from "@/lib/links/sort";
import { useSearchQuery } from "@/hooks/use-search-query";

/**
 * The shared body of every link-list page (Inbox, Favorites, All Links,
 * Archive): a heading, search + filter controls, and the resulting list.
 *
 * Each page passes in `baseLinks` already scoped to its own meaning (unread
 * statuses for Inbox, `isFavorite` for Favorites, and so on); this component
 * only handles the search/filter/sort layered on top, so that logic is
 * written once instead of once per page.
 *
 * Uses `useSearchParams` (via `useSearchQuery`), so per the Next.js 16 docs the
 * page rendering this component must wrap it in `<Suspense>`.
 */
export interface LinkCollectionViewProps {
  eyebrow: string;
  title: string;
  description: string;
  baseLinks: Link[];
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: LucideIcon;
  hideStatusFilter?: boolean;
  onAddLink?: () => void;
}

export function LinkCollectionView({
  eyebrow,
  title,
  description,
  baseLinks,
  emptyTitle,
  emptyDescription,
  emptyIcon = InboxIcon,
  hideStatusFilter = false,
  onAddLink,
}: LinkCollectionViewProps) {
  const { query, setQuery } = useSearchQuery();
  const [status, setStatus] = useState<LinkStatus[]>([]);
  const [priority, setPriority] = useState<Priority[]>([]);
  const [sort, setSort] = useState<LinkSort>("newest");

  const filter = { query, status, priority };
  const filtered = filterLinks(baseLinks, filter);
  const sorted = sortLinks(filtered, sort);
  const filtersActive = isFilterActive(filter);

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          label={`Search ${title.toLowerCase()}`}
          placeholder="Search title, domain, description or tags..."
          className="sm:max-w-sm"
        />
        <LinkFilters
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          sort={sort}
          onSortChange={setSort}
          hideStatus={hideStatusFilter}
        />
      </div>

      <p className="text-xs text-ink-subtle">
        {sorted.length} {sorted.length === 1 ? "link" : "links"}
        {filtersActive ? " matching your filters" : ""}
      </p>

      <LinkList
        links={sorted}
        emptyState={
          <EmptyState
            icon={emptyIcon}
            title={filtersActive ? "No links match" : emptyTitle}
            description={
              filtersActive
                ? "Try a different search term or clear your filters."
                : emptyDescription
            }
            action={
              filtersActive ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setStatus([]);
                    setPriority([]);
                  }}
                >
                  Clear filters
                </Button>
              ) : onAddLink ? (
                <Button variant="primary" onClick={onAddLink}>
                  Add your first link
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
