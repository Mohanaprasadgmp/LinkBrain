"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * A confirmation prompt for a destructive action, built on the existing
 * `Dialog` primitive so it inherits its focus trap / Escape / portal
 * behaviour for free rather than re-implementing them.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. Defaults to true — every current caller deletes something. */
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Working..." : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-muted">{description}</p>
    </Dialog>
  );
}
