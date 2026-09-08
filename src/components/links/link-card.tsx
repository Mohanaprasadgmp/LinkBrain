"use client";

import { Star } from "lucide-react";

import { Favicon } from "@/components/links/favicon";
import { LinkActionsMenu } from "@/components/links/link-actions-menu";
import { PriorityBadge } from "@/components/links/priority-badge";
import { StatusBadge } from "@/components/links/status-badge";
import { IconButton } from "@/components/ui/button";
import type { Link } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeDate } from "@/lib/utils/date";
import { useLinkStore } from "@/store/link-store";

/**
 * A single saved link.
 *
 * Rendered as a row rather than a boxed card — a hairline divider between rows
 * (owned by the parent `LinkList`) reads calmer at a glance than a stack of
 * bordered boxes, in keeping with the editorial direction.
 */
export function LinkCard({
  link,
  onEdit,
}: {
  link: Link;
  onEdit: (link: Link) => void;
}) {
  const { toggleFavorite } = useLinkStore();

  return (
    <article className="group flex gap-3 py-4">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
        aria-hidden="true"
        tabIndex={-1}
      >
        <Favicon domain={link.domain} className="mt-0.5" />
      </a>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-subtle">{link.domain}</p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-base leading-snug text-ink hover:text-accent"
            >
              {link.title}
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label={link.isFavorite ? "Remove from favorites" : "Add to favorites"}
              size="sm"
              onClick={() => toggleFavorite(link.id)}
            >
              <Star
                aria-hidden="true"
                className={cn(
                  "size-4",
                  link.isFavorite
                    ? "fill-warning text-warning"
                    : "text-ink-subtle group-hover:text-ink-muted",
                )}
              />
            </IconButton>
            <LinkActionsMenu link={link} onEdit={onEdit} />
          </div>
        </div>

        {link.description ? (
          <p className="line-clamp-2-safe mt-1 text-sm text-ink-muted">
            {link.description}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={link.status} />
          <PriorityBadge priority={link.priority} />
          {link.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted"
            >
              #{tag}
            </span>
          ))}
          <span className="ml-auto text-xs whitespace-nowrap text-ink-subtle">
            {formatRelativeDate(link.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
