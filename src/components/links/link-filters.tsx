"use client";

import { ListFilter } from "lucide-react";

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
import { SORT_OPTIONS } from "@/lib/links/sort";
import { cn } from "@/lib/utils/cn";

/**
 * The status/priority filter menu and sort control shown above a link list.
 *
 * Status and priority filters are multi-select (the underlying `LinkFilter`
 * takes arrays), toggled by re-selecting an already-active option, so a page
 * like Archive can still let the user narrow further by priority.
 */
export interface LinkFiltersProps {
  status: LinkStatus[];
  onStatusChange: (status: LinkStatus[]) => void;
  priority: Priority[];
  onPriorityChange: (priority: Priority[]) => void;
  sort: LinkSort;
  onSortChange: (sort: LinkSort) => void;
  /** Hide the status filter on pages that already filter status structurally (e.g. Archive). */
  hideStatus?: boolean;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function LinkFilters({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  sort,
  onSortChange,
  hideStatus = false,
}: LinkFiltersProps) {
  const activeCount = status.length + priority.length;

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
                selected={status.includes(option.value)}
                onSelect={() => onStatusChange(toggle(status, option.value))}
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
            selected={priority.includes(option.value)}
            onSelect={() => onPriorityChange(toggle(priority, option.value))}
          >
            {option.label}
          </DropdownMenuItem>
        ))}

        {activeCount > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onStatusChange([]);
                onPriorityChange([]);
              }}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenu>

      <Select
        aria-label="Sort links"
        value={sort}
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
