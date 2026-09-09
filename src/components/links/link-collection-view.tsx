"use client";

import { Archive, Inbox as InboxIcon, Star } from "lucide-react";
import { useState } from "react";

import { ActiveFilterChips } from "@/components/links/active-filter-chips";
import { BulkActionToolbar } from "@/components/links/bulk-action-toolbar";
import { LinkFilters } from "@/components/links/link-filters";
import { LinkList } from "@/components/links/link-list";
import { LinkPagination } from "@/components/links/link-pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { SearchInput } from "@/components/search/search-input";
import { useLinkListQuery } from "@/hooks/use-link-list-query";
import type { Link } from "@/lib/domain/types";
import { LINKS_PAGE_SIZE, stateToSearchParams } from "@/lib/links/query-state";

/**
 * The shared body of every link-list page (Inbox, Favorites, All Links,
 * Archive, and the Project detail page): a heading, search + filter
 * controls, bulk selection, the resulting page of links, and pagination.
 *
 * `links`/`totalCount` are exactly the current page's data, already
 * filtered/sorted/paginated server-side by the caller (see `all-links-view.tsx`
 * and siblings) from the same URL state this component reads via
 * `useLinkListQuery` — this component owns no list-narrowing logic of its
 * own, only the controls that change the URL and the selection UI layered on
 * top of whatever page of links it's handed.
 *
 * Uses `useSearchParams` (via `useLinkListQuery`), so per the Next.js 16 docs
 * the page rendering this component must wrap it in `<Suspense>` — already
 * true of every caller (see each `page.tsx`).
 */
const EMPTY_ICONS = {
  inbox: InboxIcon,
  star: Star,
  archive: Archive,
} as const;

export interface LinkCollectionViewProps {
  eyebrow: string;
  title: string;
  description: string;
  links: Link[];
  totalCount: number;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: keyof typeof EMPTY_ICONS;
  /** Hide a facet on pages that already filter it structurally (Archive/Favorites/a project's own page). */
  hideStatusFilter?: boolean;
  hideFavoriteFilter?: boolean;
  hideProjectFilter?: boolean;
  /** Rendered in the heading's action slot — used by the Project detail page for rename/delete. */
  headerAction?: React.ReactNode;
}

export function LinkCollectionView({
  eyebrow,
  title,
  description,
  links,
  totalCount,
  emptyTitle,
  emptyDescription,
  emptyIcon = "inbox",
  hideStatusFilter = false,
  hideFavoriteFilter = false,
  hideProjectFilter = false,
  headerAction,
}: LinkCollectionViewProps) {
  const {
    state,
    setQuery,
    toggleStatus,
    togglePriority,
    setProject,
    setFavorite,
    setSort,
    setPage,
    clearAll,
  } = useLinkListQuery();

  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Selection only means something for the exact filter/sort/page it was made
  // under — reset it whenever any of those change in the URL, without
  // clearing it after a same-page mutation (which refreshes `links` but
  // leaves the URL untouched). Adjusted during render, the same pattern
  // `EditLinkDialog` uses for state that must change in the same render as
  // the value driving it — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const queryKey = stateToSearchParams(state).toString();
  const [priorQueryKey, setPriorQueryKey] = useState(queryKey);
  if (queryKey !== priorQueryKey) {
    setPriorQueryKey(queryKey);
    setSelectedIds(new Set());
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtersActive =
    Boolean(state.query.trim()) ||
    state.status.length > 0 ||
    state.priority.length > 0 ||
    Boolean(state.projectId) ||
    state.favorite;

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={headerAction}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={state.query}
          onChange={setQuery}
          label={`Search ${title.toLowerCase()}`}
          placeholder="Search title, domain, or description..."
          className="sm:max-w-sm"
        />
        <LinkFilters
          state={state}
          onToggleStatus={toggleStatus}
          onTogglePriority={togglePriority}
          onProjectChange={setProject}
          onFavoriteChange={setFavorite}
          onSortChange={setSort}
          onClearAll={clearAll}
          hideStatus={hideStatusFilter}
          hideProject={hideProjectFilter}
          hideFavorite={hideFavoriteFilter}
        />
      </div>

      <ActiveFilterChips
        state={state}
        onToggleStatus={toggleStatus}
        onTogglePriority={togglePriority}
        onProjectChange={setProject}
        onFavoriteChange={setFavorite}
        onClearQuery={() => setQuery("")}
        onClearAll={clearAll}
      />

      {selectedIds.size > 0 ? (
        <BulkActionToolbar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          onError={setError}
        />
      ) : (
        <p className="text-xs text-ink-subtle">
          {totalCount} {totalCount === 1 ? "link" : "links"}
          {filtersActive ? " matching your filters" : ""}
        </p>
      )}

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <LinkList
        links={links}
        selection={{ selectedIds, onToggle: toggleSelected }}
        emptyState={
          <EmptyState
            icon={EMPTY_ICONS[emptyIcon]}
            title={filtersActive ? "No links match" : emptyTitle}
            description={
              filtersActive
                ? "Try a different search term or clear your filters."
                : emptyDescription
            }
            action={
              filtersActive ? (
                <Button variant="secondary" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />

      <LinkPagination
        page={state.page}
        pageSize={LINKS_PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </div>
  );
}
