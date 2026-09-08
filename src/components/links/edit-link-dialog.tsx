"use client";

import { useState, useTransition } from "react";

import { useProjects } from "@/components/layout/projects-context";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { LinkFormFields, type LinkFormValues } from "@/components/links/link-form-fields";
import { updateLink } from "@/lib/actions/links";
import type { Link } from "@/lib/domain/types";
import { parseTagInput } from "@/lib/utils/tags";

export interface EditLinkDialogProps {
  link: Link | null;
  onClose: () => void;
}

function valuesFromLink(link: Link): LinkFormValues {
  return {
    url: link.url,
    title: link.title,
    description: link.description,
    note: link.note,
    tagsInput: link.tags.join(", "),
    status: link.status,
    priority: link.priority,
    projectId: link.projectId ?? "",
  };
}

/**
 * The edit dialog.
 *
 * Takes the link to edit directly (rather than an id + open flag) so the
 * dialog only needs to exist, and only calls its Server Action, while a link
 * is actually being edited.
 */
export function EditLinkDialog({ link, onClose }: EditLinkDialogProps) {
  const projects = useProjects();
  const [values, setValues] = useState<LinkFormValues | null>(
    link ? valuesFromLink(link) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-seed the form whenever a different link is opened for editing.
  // Adjusted during render rather than in an effect, so the new link's values
  // appear in the same render as the link itself — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [priorLink, setPriorLink] = useState(link);
  if (link !== priorLink) {
    setPriorLink(link);
    setValues(link ? valuesFromLink(link) : null);
    setError(null);
  }

  // Nothing to edit: render nothing rather than an empty dialog shell.
  if (!link || !values) {
    return null;
  }

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateLink(link.id, {
        title: values.title.trim() || link.title,
        description: values.description,
        note: values.note,
        tags: parseTagInput(values.tagsInput),
        status: values.status,
        priority: values.priority,
        projectId: values.projectId || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onClose();
    });
  };

  return (
    <Dialog
      open
      onClose={handleClose}
      title="Edit link"
      description={link.domain}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="edit-link-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="edit-link-form" onSubmit={handleSubmit}>
        <LinkFormFields
          values={values}
          onChange={(patch) =>
            setValues((current) => (current ? { ...current, ...patch } : current))
          }
          projects={projects}
          urlEditable={false}
        />
        {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
