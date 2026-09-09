"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { createProject, updateProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/domain/types";

export interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit mode when provided, create mode when omitted/`null`. */
  project?: Project | null;
  onSaved?: (project: Project) => void;
}

const MAX_NAME_LENGTH = 100;

/**
 * Create and edit share one component — the form is two fields, so splitting
 * it into two components the way `AddLinkDialog`/`EditLinkDialog` are split
 * (which each carry meaningfully different flows beyond the form itself)
 * would just be two near-identical files.
 */
export function ProjectDialog({ open, onClose, project = null, onSaved }: ProjectDialogProps) {
  const isEdit = Boolean(project);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-seed the form whenever a different project (or a switch to create
  // mode) opens — the same "adjust during render" pattern `EditLinkDialog`
  // uses for state that must change in the same render as the prop driving it.
  const [priorProject, setPriorProject] = useState(project);
  if (project !== priorProject) {
    setPriorProject(project);
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setError(null);
  }

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      const result =
        isEdit && project
          ? await updateProject(project.id, { name, description })
          : await createProject({ name, description });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved?.(result.data);
      if (!isEdit) {
        setName("");
        setDescription("");
      }
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? "Edit project" : "New project"}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="project-form" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. AWS Learning"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
            />
          )}
        </Field>

        <Field label="Description" hint="Optional.">
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project for?"
            />
          )}
        </Field>

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
