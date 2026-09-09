import { PRIORITY_ORDER } from "@/lib/domain/priority";
import { STATUS_ORDER } from "@/lib/domain/status";
import type { LinkFilter, LinkSort, LinkStatus, Priority } from "@/lib/domain/types";

/**
 * The full set of URL search params every link-list page (Inbox, Favorites,
 * All Links, Archive, and the Project detail page) reads and writes.
 *
 * Kept as one parse/serialise pair so the URL is the single source of truth
 * for list state — shareable, bookmarkable, and correct on refresh — rather
 * than duplicated as React state that can drift from the address bar. Pure
 * and framework-agnostic: it takes a `URLSearchParams` (client) or the plain
 * `{[key]: string | string[] | undefined}` shape Next's Server Component
 * `searchParams` prop provides, so the same parser runs on both sides.
 */
export const LINKS_PAGE_SIZE = 30;

export interface LinkListQueryState {
  query: string;
  status: LinkStatus[];
  priority: Priority[];
  projectId: string | null;
  favorite: boolean;
  sort: LinkSort;
  page: number;
}

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function readParam(params: SearchParamsLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const VALID_STATUS = new Set<string>(STATUS_ORDER);
const VALID_PRIORITY = new Set<string>(PRIORITY_ORDER);
const VALID_SORT = new Set<string>([
  "newest",
  "oldest",
  "recently-updated",
  "title",
  "title-desc",
  "priority",
]);

export const DEFAULT_LINK_SORT: LinkSort = "newest";

export function parseLinkListSearchParams(
  params: SearchParamsLike,
): LinkListQueryState {
  const status = splitList(readParam(params, "status")).filter((value) =>
    VALID_STATUS.has(value),
  ) as LinkStatus[];
  const priority = splitList(readParam(params, "priority")).filter((value) =>
    VALID_PRIORITY.has(value),
  ) as Priority[];
  const projectId = readParam(params, "project") || null;
  const favorite = readParam(params, "favorite") === "1";

  const sortRaw = readParam(params, "sort");
  const sort: LinkSort = sortRaw && VALID_SORT.has(sortRaw) ? (sortRaw as LinkSort) : DEFAULT_LINK_SORT;

  const pageRaw = Number(readParam(params, "page"));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  return {
    query: readParam(params, "q") ?? "",
    status,
    priority,
    projectId,
    favorite,
    sort,
    page,
  };
}

/** Build a `URLSearchParams` for a (possibly partial) state, e.g. to construct an href. */
export function stateToSearchParams(state: Partial<LinkListQueryState>): URLSearchParams {
  const params = new URLSearchParams();

  if (state.query) params.set("q", state.query);
  if (state.status?.length) params.set("status", state.status.join(","));
  if (state.priority?.length) params.set("priority", state.priority.join(","));
  if (state.projectId) params.set("project", state.projectId);
  if (state.favorite) params.set("favorite", "1");
  if (state.sort && state.sort !== DEFAULT_LINK_SORT) params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));

  return params;
}

/** Translate the parsed URL state into the `LinkFilter` the repository layer understands. */
export function stateToFilter(state: LinkListQueryState): LinkFilter {
  return {
    query: state.query || undefined,
    status: state.status.length ? state.status : undefined,
    priority: state.priority.length ? state.priority : undefined,
    projectId: state.projectId ?? undefined,
    isFavorite: state.favorite ? true : undefined,
  };
}
