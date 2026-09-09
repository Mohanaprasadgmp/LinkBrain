"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { useOptimistic, useState, useTransition } from "react";

import { Favicon } from "@/components/links/favicon";
import { LinkActionsMenu } from "@/components/links/link-actions-menu";
import { PriorityBadge } from "@/components/links/priority-badge";
import { StatusBadge } from "@/components/links/status-badge";
import { IconButton } from "@/components/ui/button";
import { toggleFavorite } from "@/lib/actions/links";
import type { Link } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeDate } from "@/lib/utils/date";

/**
 * A single saved link.
 *
 * Rendered as a row rather than a boxed card — a hairline divider between rows
 * (owned by the parent `LinkList`) reads calmer at a glance than a stack of
 * bordered boxes, in keeping with the editorial direction.
 *
 * The favourite star is the one control on this row using `useOptimistic`:
 * it's the highest-frequency, lowest-risk interaction, so an instant flip
 * (corrected automatically if the Server Action fails, since the star then
 * has nothing to reconcile back to but the original `link` prop) is worth
 * the extra hook. Everything else on the row goes through `LinkActionsMenu`,
 * which uses a plain pending state instead.
 */
export function LinkCard({
  link,
  onEdit,
  selected,
  onSelectChange,
}: {
  link: Link;
  onEdit: (link: Link) => void;
  /** Omit both `selected`/`onSelectChange` to render without a selection checkbox at all. */
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}) {
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(link.isFavorite);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewImage = previewFailed ? null : link.previewImage;

  const handleToggleFavorite = () => {
    setError(null);
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      const result = await toggleFavorite(link.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <article className="group flex flex-col gap-1 py-4">
      <div className="flex gap-3">
        {onSelectChange ? (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(event) => onSelectChange(event.target.checked)}
            aria-label={`Select ${link.title}`}
            className="mt-2 size-4 shrink-0 rounded border-border-strong text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          />
        ) : null}

        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
          aria-hidden="true"
          tabIndex={-1}
        >
          <Favicon domain={link.domain} src={link.favicon} className="mt-0.5" />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-ink-subtle">{link.domain}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.9375rem] leading-snug font-semibold text-ink hover:text-accent"
              >
                {link.title}
              </a>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton
                label={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
                size="sm"
                onClick={handleToggleFavorite}
              >
                <Star
                  aria-hidden="true"
                  className={cn(
                    "size-4",
                    optimisticFavorite
                      ? "fill-warning text-warning"
                      : "text-ink-subtle group-hover:text-ink-muted",
                  )}
                />
              </IconButton>
              <LinkActionsMenu link={link} onEdit={onEdit} onError={setError} />
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
            <span className="ml-auto text-xs whitespace-nowrap text-ink-subtle">
              {formatRelativeDate(link.createdAt)}
            </span>
          </div>
        </div>

        {previewImage ? (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 self-start sm:block"
            aria-hidden="true"
            tabIndex={-1}
          >
            {/* Fixed dimensions so a slow-loading or missing image never
                shifts the row — it either occupies exactly this box or,
                via onError, nothing at all. */}
            <Image
              src={previewImage}
              alt=""
              width={64}
              height={64}
              unoptimized
              onError={() => setPreviewFailed(true)}
              className="size-16 rounded-lg border border-border object-cover"
            />
          </a>
        ) : null}
      </div>

      {error ? <p className="pl-11 text-xs text-danger">{error}</p> : null}
    </article>
  );
}
