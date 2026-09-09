"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import type { LinkSort, LinkStatus, Priority } from "@/lib/domain/types";
import {
  parseLinkListSearchParams,
  stateToSearchParams,
  type LinkListQueryState,
} from "@/lib/links/query-state";

/**
 * Reads and writes the full link-list URL state (search, status/priority/
 * project/favorite filters, sort, page) — the generalised form of
 * `useSearchQuery`, which only ever handled `?q=`. Every setter besides
 * `setPage` resets `page` back to 1, since a page number from a different
 * filter/sort combination doesn't mean anything once that combination changes.
 *
 * Calls `useSearchParams`, so per the Next.js 16 docs any component using this
 * hook must sit under a `<Suspense>` boundary or `next build` fails with a
 * "Missing Suspense boundary" error — see `LinkCollectionView`'s callers.
 */
export function useLinkListQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const state = parseLinkListSearchParams(searchParams);

  const navigate = useCallback(
    (next: LinkListQueryState) => {
      const queryString = stateToSearchParams(next).toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  const setQuery = useCallback(
    (query: string) => navigate({ ...state, query, page: 1 }),
    [state, navigate],
  );

  const toggleStatus = useCallback(
    (status: LinkStatus) => {
      const next = state.status.includes(status)
        ? state.status.filter((value) => value !== status)
        : [...state.status, status];
      navigate({ ...state, status: next, page: 1 });
    },
    [state, navigate],
  );

  const togglePriority = useCallback(
    (priority: Priority) => {
      const next = state.priority.includes(priority)
        ? state.priority.filter((value) => value !== priority)
        : [...state.priority, priority];
      navigate({ ...state, priority: next, page: 1 });
    },
    [state, navigate],
  );

  const setProject = useCallback(
    (projectId: string | null) => navigate({ ...state, projectId, page: 1 }),
    [state, navigate],
  );

  const setFavorite = useCallback(
    (favorite: boolean) => navigate({ ...state, favorite, page: 1 }),
    [state, navigate],
  );

  const setSort = useCallback(
    (sort: LinkSort) => navigate({ ...state, sort, page: 1 }),
    [state, navigate],
  );

  const setPage = useCallback(
    (page: number) => navigate({ ...state, page }),
    [state, navigate],
  );

  const clearAll = useCallback(
    () =>
      navigate({
        ...state,
        query: "",
        status: [],
        priority: [],
        projectId: null,
        favorite: false,
        page: 1,
      }),
    [state, navigate],
  );

  return {
    state,
    isPending,
    setQuery,
    toggleStatus,
    togglePriority,
    setProject,
    setFavorite,
    setSort,
    setPage,
    clearAll,
  };
}
