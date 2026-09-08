"use client";

import {
  Archive,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/button";
import { PRIORITY_OPTIONS } from "@/lib/domain/priority";
import { STATUS_OPTIONS } from "@/lib/domain/status";
import type { Link } from "@/lib/domain/types";
import { useLinkStore } from "@/store/link-store";

/**
 * The "more actions" menu on a link card.
 *
 * Every action here mutates the shared store directly (favorite, status,
 * priority, archive, delete); Edit instead calls back up to the caller, since
 * opening the edit dialog needs to be coordinated with the rest of the page
 * (only one dialog open at a time).
 */
export function LinkActionsMenu({
  link,
  onEdit,
  onDeleted,
}: {
  link: Link;
  onEdit: (link: Link) => void;
  /** Called after delete, so a list can drop its own reference if it holds one. */
  onDeleted?: (id: string) => void;
}) {
  const { toggleFavorite, setStatus, setPriority, archiveLink, deleteLink } =
    useLinkStore();

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
        onSelect={() => toggleFavorite(link.id)}
      >
        {link.isFavorite ? "Remove from favorites" : "Add to favorites"}
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuLabel>Status</DropdownMenuLabel>
      {STATUS_OPTIONS.map((option) => (
        <DropdownMenuItem
          key={option.value}
          selected={link.status === option.value}
          onSelect={() => setStatus(link.id, option.value)}
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
          onSelect={() => setPriority(link.id, option.value)}
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
          onSelect={() => archiveLink(link.id)}
        >
          Archive
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        icon={<Trash2 className="size-4" />}
        destructive
        onSelect={() => {
          deleteLink(link.id);
          onDeleted?.(link.id);
        }}
      >
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
