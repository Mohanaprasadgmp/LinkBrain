"use client";

import {
  Archive,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/button";
import {
  archiveLink,
  deleteLink,
  toggleFavorite,
  updateLinkPriority,
  updateLinkStatus,
} from "@/lib/actions/links";
import { PRIORITY_OPTIONS } from "@/lib/domain/priority";
import { STATUS_OPTIONS } from "@/lib/domain/status";
import type { Link } from "@/lib/domain/types";

/**
 * The "more actions" menu on a link card.
 *
 * Every mutation here calls its Server Action inside a `useTransition` (menu
 * items disable while pending, rather than getting `useOptimistic` treatment
 * like the favourite star) and reports failures via `onError` so the row can
 * show one shared inline error message regardless of which control caused it.
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

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error) onError(result.error);
    });
  };

  return (
    <DropdownMenu
      label={`Actions for ${link.title}`}
      trigger={(triggerProps) => (
        <IconButton {...triggerProps} label="More actions" size="sm">
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </IconButton>
      )}
    >
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

      <DropdownMenuLabel>Status</DropdownMenuLabel>
      {STATUS_OPTIONS.map((option) => (
        <DropdownMenuItem
          key={option.value}
          selected={link.status === option.value}
          disabled={isPending}
          onSelect={() => run(() => updateLinkStatus(link.id, option.value))}
        >
          {option.label}
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />

      <DropdownMenuLabel>Priority</DropdownMenuLabel>
      {PRIORITY_OPTIONS.map((option) => (
        <DropdownMenuItem
          key={option.value}
          selected={link.priority === option.value}
          disabled={isPending}
          onSelect={() => run(() => updateLinkPriority(link.id, option.value))}
        >
          {option.label}
        </DropdownMenuItem>
      ))}

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
        onSelect={() => run(() => deleteLink(link.id))}
      >
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
