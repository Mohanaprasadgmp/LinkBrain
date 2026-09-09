"use client";

import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { Panel } from "@/components/ui/panel";
import type { Project, ProjectAccent } from "@/lib/domain/types";
import { formatRelativeDate } from "@/lib/utils/date";

const ACCENT_CLASSES: Record<ProjectAccent, string> = {
  violet: "bg-accent/10 text-accent",
  amber: "bg-warning/10 text-warning",
  teal: "bg-info/10 text-info",
  rose: "bg-danger/10 text-danger",
  slate: "bg-surface-sunken text-ink-muted",
};

/**
 * The name/description area is a `<Link>` to the project's detail page; the
 * actions menu is a sibling rather than nested inside it — an interactive
 * element (the menu's button) inside an `<a>` would either be invalid HTML
 * or need `stopPropagation` tricks to stop the browser navigating on every
 * click, and two adjacent elements avoids the problem entirely.
 */
export function ProjectCard({
  project,
  linkCount,
  lastActivity,
}: {
  project: Project;
  linkCount: number;
  lastActivity: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Panel className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex size-9 items-center justify-center rounded-lg ${ACCENT_CLASSES[project.accent]}`}
        >
          <FolderOpen aria-hidden="true" className="size-4.5" />
        </span>
        <ProjectActionsMenu project={project} onError={setError} />
      </div>

      <Link href={`/projects/${project.id}`} className="block min-w-0">
        <h3 className="text-base font-semibold text-ink hover:text-accent">{project.name}</h3>
        {project.description ? (
          <p className="mt-1 line-clamp-2-safe text-sm text-ink-muted">{project.description}</p>
        ) : null}
      </Link>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-ink-subtle">
        <span>
          {linkCount} {linkCount === 1 ? "link" : "links"}
        </span>
        <span>Updated {formatRelativeDate(lastActivity)}</span>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </Panel>
  );
}
