"use client";

import { Archive, ChevronDown, Star, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { useProjects } from "@/components/layout/projects-context";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { bulkUpdateLinks } from "@/lib/actions/links";
import { PRIORITY_OPTIONS } from "@/lib/domain/priority";
import { STATUS_OPTIONS } from "@/lib/domain/status";
import type { BulkLinkAction } from "@/lib/domain/types";

/**
 * The toolbar shown above a link list once one or more rows are selected.
 *
 * Every action here is one `bulkUpdateLinks` call (see `lib/actions/links.ts`)
 * covering every selected id at once — never a client-side loop calling a
 * single-link action per row. Selection is cleared after any action
 * completes (success or the confirm-delete flow), rather than trying to
 * track which ids are still meaningfully selected across a data refetch.
 */
export interface BulkActionToolbarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onError: (message: string) => void;
}

export function BulkActionToolbar({
  selectedIds,
  onClearSelection,
  onError,
}: BulkActionToolbarProps) {
  const projects = useProjects();
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const ids = Array.from(selectedIds);

  const run = (action: BulkLinkAction) => {
    startTransition(async () => {
      const result = await bulkUpdateLinks(ids, action);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onClearSelection();
    });
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const result = await bulkUpdateLinks(ids, { type: "delete" });
      setConfirmDeleteOpen(false);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onClearSelection();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
      <p className="text-xs font-medium text-ink">
        {selectedIds.size} {selectedIds.size === 1 ? "link" : "links"} selected
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <DropdownMenu
          label="Change status"
          trigger={(triggerProps) => (
            <Button {...triggerProps} variant="secondary" size="sm" disabled={isPending}>
              Status
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        >
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => run({ type: "status", status: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>

        <DropdownMenu
          label="Change priority"
          trigger={(triggerProps) => (
            <Button {...triggerProps} variant="secondary" size="sm" disabled={isPending}>
              Priority
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => run({ type: "priority", priority: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>

        <DropdownMenu
          label="Assign project"
          trigger={(triggerProps) => (
            <Button {...triggerProps} variant="secondary" size="sm" disabled={isPending}>
              Project
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        >
          <DropdownMenuItem onSelect={() => run({ type: "project", projectId: null })}>
            No project
          </DropdownMenuItem>
          {projects.length > 0 ? <DropdownMenuSeparator /> : null}
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onSelect={() => run({ type: "project", projectId: project.id })}
            >
              {project.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>

        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => run({ type: "favorite", value: true })}
        >
          <Star aria-hidden="true" className="size-3.5" />
          Favorite
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => run({ type: "favorite", value: false })}
        >
          Unfavorite
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => run({ type: "archive" })}
        >
          <Archive aria-hidden="true" className="size-3.5" />
          Archive
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirmDeleteOpen(true)}
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Delete
        </Button>

        <IconButton label="Clear selection" size="sm" onClick={onClearSelection}>
          <X aria-hidden="true" className="size-4" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? "link" : "links"}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
