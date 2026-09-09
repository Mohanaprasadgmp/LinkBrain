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
import type { Link } from "@/lib/domain/types";
import { formatRelativeDate } from "@/lib/utils/date";
import { isValidUrl } from "@/lib/utils/url";

export interface AddLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The dialog's three phases beyond the plain form:
 *  - `duplicate`: the URL is already saved — offers "Save anyway" instead of
 *    silently creating a second copy or silently blocking it.
 *  - `partial-success`: the link saved, but metadata extraction didn't come
 *    back — shown instead of an instant close, so that isn't mistaken for
 *    the link having failed to save at all.
 */
type DialogPhase =
  | { kind: "form" }
  | { kind: "duplicate"; existingLink: Link }
  | { kind: "partial-success" };

export function AddLinkDialog({ open, onClose }: AddLinkDialogProps) {
  const projects = useProjects();
  const [values, setValues] = useState<LinkFormValues>(EMPTY_LINK_FORM_VALUES);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [phase, setPhase] = useState<DialogPhase>({ kind: "form" });
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setValues(EMPTY_LINK_FORM_VALUES);
    setUrlError(undefined);
    setPhase({ kind: "form" });
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
      const result = await createLink(
        {
          url: values.url,
          title: values.title,
          description: values.description,
          note: values.note,
          status: values.status,
          priority: values.priority,
          projectId: values.projectId || null,
        },
        { force: phase.kind === "duplicate" },
      );

      if (!result.ok) {
        if (result.duplicate && result.existingLink) {
          setPhase({ kind: "duplicate", existingLink: result.existingLink });
          return;
        }
        setUrlError(result.error);
        return;
      }

      if (!result.metadataApplied) {
        setPhase({ kind: "partial-success" });
        return;
      }

      reset();
      onClose();
    });
  };

  if (phase.kind === "partial-success") {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        title="Link saved"
        footer={
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        }
      >
        <p className="text-sm text-ink-muted">
          Link saved. Some details couldn&rsquo;t be retrieved automatically —
          you can fill them in any time from the link&rsquo;s actions menu.
        </p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add a link"
      description="Save a URL and LinkBrain will try to fill in the title, description, and image automatically."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="add-link-form" disabled={isPending}>
            {isPending
              ? "Saving..."
              : phase.kind === "duplicate"
                ? "Save anyway"
                : "Save link"}
          </Button>
        </>
      }
    >
      <form id="add-link-form" onSubmit={handleSubmit} className="space-y-4">
        {phase.kind === "duplicate" ? (
          <p className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-ink">
            You already saved this link, {formatRelativeDate(phase.existingLink.createdAt)}.
            Save it again anyway?
          </p>
        ) : null}

        <LinkFormFields
          values={values}
          onChange={(patch) => {
            setValues((current) => ({ ...current, ...patch }));
            if (patch.url !== undefined) {
              setUrlError(undefined);
              if (phase.kind === "duplicate") setPhase({ kind: "form" });
            }
          }}
          projects={projects}
          urlError={urlError}
        />
      </form>
    </Dialog>
  );
}
