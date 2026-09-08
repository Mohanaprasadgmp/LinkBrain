"use client";

import { useState, useTransition } from "react";

import { useProjects } from "@/components/layout/projects-context";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  EMPTY_LINK_FORM_VALUES,
  LinkFormFields,
  type LinkFormValues,
} from "@/components/links/link-form-fields";
import { createLink } from "@/lib/actions/links";
import { parseTagInput } from "@/lib/utils/tags";
import { isValidUrl } from "@/lib/utils/url";

export interface AddLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddLinkDialog({ open, onClose }: AddLinkDialogProps) {
  const projects = useProjects();
  const [values, setValues] = useState<LinkFormValues>(EMPTY_LINK_FORM_VALUES);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setValues(EMPTY_LINK_FORM_VALUES);
    setUrlError(undefined);
  };

  const handleClose = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidUrl(values.url)) {
      setUrlError("Enter a valid URL, e.g. https://example.com");
      return;
    }

    startTransition(async () => {
      const result = await createLink({
        url: values.url,
        title: values.title,
        description: values.description,
        note: values.note,
        tags: parseTagInput(values.tagsInput),
        status: values.status,
        priority: values.priority,
        projectId: values.projectId || null,
      });

      if (!result.ok) {
        setUrlError(result.error);
        return;
      }

      reset();
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add a link"
      description="Save a URL to your library. Metadata extraction arrives in a later phase — for now, fill in what you know."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="add-link-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save link"}
          </Button>
        </>
      }
    >
      <form id="add-link-form" onSubmit={handleSubmit}>
        <LinkFormFields
          values={values}
          onChange={(patch) => {
            setValues((current) => ({ ...current, ...patch }));
            if (patch.url !== undefined) setUrlError(undefined);
          }}
          projects={projects}
          urlError={urlError}
        />
      </form>
    </Dialog>
  );
}
