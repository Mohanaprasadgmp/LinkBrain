"use client";

import { X } from "lucide-react";

import { useProjects } from "@/components/layout/projects-context";
import { PRIORITY_META } from "@/lib/domain/priority";
import { STATUS_META } from "@/lib/domain/status";
import type { LinkStatus, Priority } from "@/lib/domain/types";
import type { LinkListQueryState } from "@/lib/links/query-state";

/**
 * One removable chip per active filter criterion, plus "Clear all filters".
 *
 * Renders nothing when no filter is active, so pages with no filtering
 * applied look exactly as they did before this existed.
 */
export interface ActiveFilterChipsProps {
  state: LinkListQueryState;
  onToggleStatus: (status: LinkStatus) => void;
  onTogglePriority: (priority: Priority) => void;
  onProjectChange: (projectId: string | null) => void;
  onFavoriteChange: (favorite: boolean) => void;
  onClearQuery: () => void;
  onClearAll: () => void;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-sunken py-1 pr-1 pl-2.5 text-xs text-ink">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full p-0.5 text-ink-subtle hover:text-ink"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
}

export function ActiveFilterChips({
  state,
  onToggleStatus,
  onTogglePriority,
  onProjectChange,
  onFavoriteChange,
  onClearQuery,
  onClearAll,
}: ActiveFilterChipsProps) {
  const projects = useProjects();
  const project = state.projectId ? projects.find((p) => p.id === state.projectId) : undefined;
  const query = state.query.trim();

  const hasAny =
    Boolean(query) ||
    state.status.length > 0 ||
    state.priority.length > 0 ||
    Boolean(project) ||
    state.favorite;

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {query ? <Chip label={`Search: "${query}"`} onRemove={onClearQuery} /> : null}
      {state.status.map((status) => (
        <Chip key={status} label={STATUS_META[status].label} onRemove={() => onToggleStatus(status)} />
      ))}
      {state.priority.map((priority) => (
        <Chip
          key={priority}
          label={PRIORITY_META[priority].label}
          onRemove={() => onTogglePriority(priority)}
        />
      ))}
      {project ? <Chip label={project.name} onRemove={() => onProjectChange(null)} /> : null}
      {state.favorite ? (
        <Chip label="Favorites only" onRemove={() => onFavoriteChange(false)} />
      ) : null}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-accent hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
