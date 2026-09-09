"use client";

import { ExternalLink, Pencil, Star } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { useOptimistic, useState, useTransition } from "react";

import { AiInsightsPanel } from "@/components/links/ai-insights-panel";
import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { Favicon } from "@/components/links/favicon";
import { Button, IconButton } from "@/components/ui/button";
import { toggleFavorite, updateLinkPriority, updateLinkStatus } from "@/lib/actions/links";
import { PRIORITY_OPTIONS } from "@/lib/domain/priority";
import { STATUS_OPTIONS } from "@/lib/domain/status";
import type { AiInsight, Link as LinkRecord, Project } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeDate } from "@/lib/utils/date";

/**
 * The Link Detail page body.
 *
 * Status/priority get a visible button-group here rather than the compact
 * dropdown `LinkActionsMenu` uses on a card row — this page is exactly where
 * "an obvious status control" (as opposed to the card's deliberately compact
 * row) belongs; the card itself is left untouched. Favorite reuses the same
 * `useOptimistic` pattern `LinkCard` uses. Editing reuses `EditLinkDialog`
 * unchanged — this page never touches `link.url` itself, only "Open Link"
 * opens it, in a new tab.
 */
export function LinkDetailBody({
  link,
  project,
  aiInsight,
}: {
  link: LinkRecord;
  project: Project | null;
  aiInsight: AiInsight | null;
}) {
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(link.isFavorite);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error) setError(result.error);
    });
  };

  const handleToggleFavorite = () => {
    setError(null);
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      const result = await toggleFavorite(link.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Favicon domain={link.domain} src={link.favicon} className="mt-1 size-10" />
          <div className="min-w-0">
            <p className="text-xs text-ink-subtle">{link.domain}</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{link.title}</h1>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-sm text-accent hover:underline"
            >
              {link.url}
            </a>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            label={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={handleToggleFavorite}
          >
            <Star
              aria-hidden="true"
              className={cn(
                "size-5",
                optimisticFavorite ? "fill-warning text-warning" : "text-ink-subtle",
              )}
            />
          </IconButton>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Button>
          <Button
            variant="primary"
            onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Open Link
          </Button>
        </div>
      </div>

      {link.previewImage && !previewFailed ? (
        <Image
          src={link.previewImage}
          alt=""
          width={960}
          height={400}
          unoptimized
          onError={() => setPreviewFailed(true)}
          className="max-h-80 w-full rounded-xl border border-border object-cover"
        />
      ) : null}

      {link.description ? <p className="text-sm text-ink-muted">{link.description}</p> : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h2 className="label-eyebrow mb-2">Status</h2>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={link.status === option.value ? "primary" : "secondary"}
                disabled={isPending}
                onClick={() => run(() => updateLinkStatus(link.id, option.value))}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="label-eyebrow mb-2">Priority</h2>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={link.priority === option.value ? "primary" : "secondary"}
                disabled={isPending}
                onClick={() => run(() => updateLinkPriority(link.id, option.value))}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>
      </div>

      {link.note ? (
        <section>
          <h2 className="label-eyebrow mb-2">Personal note</h2>
          <p className="whitespace-pre-wrap text-sm text-ink">{link.note}</p>
        </section>
      ) : null}

      {project ? (
        <section>
          <h2 className="label-eyebrow mb-2">Project</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <NextLink
              href={`/projects/${project.id}`}
              className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted hover:text-ink"
            >
              {project.name}
            </NextLink>
          </div>
        </section>
      ) : null}

      <AiInsightsPanel linkId={link.id} insight={aiInsight} />

      <div className="flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-ink-subtle">
        <span>Saved {formatRelativeDate(link.createdAt)}</span>
        <span>Updated {formatRelativeDate(link.updatedAt)}</span>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <EditLinkDialog link={editOpen ? link : null} onClose={() => setEditOpen(false)} />
    </div>
  );
}
