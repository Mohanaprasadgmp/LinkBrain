"use client";

import { ListFilter } from "lucide-react";

import { useProjects } from "@/components/layout/projects-context";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PRIORITY_OPTIONS } from "@/lib/domain/priority";
import { STATUS_OPTIONS } from "@/lib/domain/status";
import type { LinkSort, LinkStatus, Priority } from "@/lib/domain/types";
import type { LinkListQueryState } from "@/lib/links/query-state";
import { SORT_OPTIONS } from "@/lib/links/sort";
import { cn } from "@/lib/utils/cn";

/**
 * The status/priority/project/favorite filter menu and sort control shown
 * above a link list.
 *
 * Status and priority are multi-select (the underlying `LinkFilter` takes
 * arrays), toggled by re-selecting an already-active option. Project and
 * favorite are single-value. `state` is the parsed URL query state from
 * `useLinkListQuery`; every `on*` handler here is one of that hook's setters,
 * passed straight through by the caller.
 */
export interface LinkFiltersProps {
  state: LinkListQueryState;
  onToggleStatus: (status: LinkStatus) => void;
  onTogglePriority: (priority: Priority) => void;
  onProjectChange: (projectId: string | null) => void;
  onFavoriteChange: (favorite: boolean) => void;
  onSortChange: (sort: LinkSort) => void;
  onClearAll: () => void;
  /** Hide a facet on pages that already filter it structurally (e.g. status on Archive, favorite on Favorites). */
  hideStatus?: boolean;
  hideProject?: boolean;
  hideFavorite?: boolean;
}

export function LinkFilters({
  state,
  onToggleStatus,
  onTogglePriority,
  onProjectChange,
  onFavoriteChange,
  onSortChange,
  onClearAll,
  hideStatus = false,
  hideProject = false,
  hideFavorite = false,
}: LinkFiltersProps) {
  const projects = useProjects();
  const activeCount =
    state.status.length +
    state.priority.length +
    (hideProject ? 0 : state.projectId ? 1 : 0) +
    (hideFavorite ? 0 : state.favorite ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu
        label="Filter links"
        trigger={(triggerProps) => (
          <Button {...triggerProps} variant="secondary" size="sm">
            <ListFilter aria-hidden="true" className="size-3.5" />
            Filter
            {activeCount > 0 ? (
              <span className="rounded-full bg-accent/15 px-1.5 text-[0.6875rem] font-semibold text-accent">
                {activeCount}
              </span>
            ) : null}
          </Button>
        )}
      >
        {!hideStatus ? (
          <>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                selected={state.status.includes(option.value)}
                onSelect={() => onToggleStatus(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        {PRIORITY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            selected={state.priority.includes(option.value)}
            onSelect={() => onTogglePriority(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}

        {!hideProject && projects.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                selected={state.projectId === project.id}
                onSelect={() => onProjectChange(state.projectId === project.id ? null : project.id)}
              >
                {project.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        {!hideFavorite ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              selected={state.favorite}
              onSelect={() => onFavoriteChange(!state.favorite)}
            >
              Favorites only
            </DropdownMenuItem>
          </>
        ) : null}

        {activeCount > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onClearAll}>Clear filters</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenu>

      <Select
        aria-label="Sort links"
        value={state.sort}
        onChange={(event) => onSortChange(event.target.value as LinkSort)}
        className={cn("w-auto min-w-[9.5rem]")}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
