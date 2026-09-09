"use client";

import {
  Archive,
  ExternalLink,
  Info,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/button";
import { archiveLink, deleteLink, toggleFavorite } from "@/lib/actions/links";
import type { Link } from "@/lib/domain/types";

/**
 * The "more actions" menu on a link card.
 *
 * Every mutation here calls its Server Action inside a `useTransition` (menu
 * items disable while pending, rather than getting `useOptimistic` treatment
 * like the favourite star) and reports failures via `onError` so the row can
 * show one shared inline error message regardless of which control caused it.
 * Delete goes through a confirmation dialog rather than firing immediately —
 * every other mutation here is easily reversed from the same menu, delete
 * isn't.
 */
export function LinkActionsMenu({
  link,
  onEdit,
  onError,
}: {
  link: Link;
  onEdit: (link: Link) => void;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error) onError(result.error);
    });
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const result = await deleteLink(link.id);
      if (!result.ok) onError(result.error);
      setConfirmDeleteOpen(false);
    });
  };

  return (
    <>
      <DropdownMenu
        label={`Actions for ${link.title}`}
        trigger={(triggerProps) => (
          <IconButton {...triggerProps} label="More actions" size="sm">
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </IconButton>
        )}
      >
        <DropdownMenuItem
          icon={<Info className="size-4" />}
          href={`/links/${link.id}`}
        >
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<ExternalLink className="size-4" />}
          onSelect={() => window.open(link.url, "_blank", "noopener,noreferrer")}
        >
          Open link
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<Star className="size-4" />}
          disabled={isPending}
          onSelect={() => run(() => toggleFavorite(link.id))}
        >
          {link.isFavorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          icon={<Pencil className="size-4" />}
          onSelect={() => onEdit(link)}
        >
          Edit
        </DropdownMenuItem>
        {link.status !== "archived" ? (
          <DropdownMenuItem
            icon={<Archive className="size-4" />}
            disabled={isPending}
            onSelect={() => run(() => archiveLink(link.id))}
          >
            Archive
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          icon={<Trash2 className="size-4" />}
          destructive
          disabled={isPending}
          onSelect={() => setConfirmDeleteOpen(true)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this link?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
