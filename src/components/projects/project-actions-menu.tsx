"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { ProjectDialog } from "@/components/projects/project-dialog";
import { IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { deleteProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/domain/types";

/**
 * Edit/delete for one project. `onDeleted` is only needed by the project's
 * own detail page (which must navigate away once its project is gone) — the
 * Projects list needs nothing extra, `deleteProject`'s own
 * `revalidatePath("/projects")` already makes the card disappear.
 */
export function ProjectActionsMenu({
  project,
  onDeleted,
  onError,
}: {
  project: Project;
  onDeleted?: () => void;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProject(project.id);
      setConfirmDeleteOpen(false);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDeleted?.();
    });
  };

  return (
    <>
      <DropdownMenu
        label={`Actions for ${project.name}`}
        trigger={(triggerProps) => (
          <IconButton {...triggerProps} label="Project actions" size="sm">
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </IconButton>
        )}
      >
        <DropdownMenuItem icon={<Pencil className="size-4" />} onSelect={() => setEditOpen(true)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<Trash2 className="size-4" />}
          destructive
          onSelect={() => setConfirmDeleteOpen(true)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenu>

      <ProjectDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${project.name}?`}
        description="Links in this project are kept — they'll just no longer belong to a project."
        confirmLabel="Delete"
        isPending={isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
