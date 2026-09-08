import { FolderOpen } from "lucide-react";

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

export function ProjectCard({
  project,
  linkCount,
  lastActivity,
}: {
  project: Project;
  linkCount: number;
  lastActivity: string;
}) {
  return (
    <Panel className="flex flex-col gap-3 p-5">
      <span
        className={`flex size-9 items-center justify-center rounded-lg ${ACCENT_CLASSES[project.accent]}`}
      >
        <FolderOpen aria-hidden="true" className="size-4.5" />
      </span>

      <div>
        <h3 className="font-display text-lg text-ink">{project.name}</h3>
        <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-ink-subtle">
        <span>
          {linkCount} {linkCount === 1 ? "link" : "links"}
        </span>
        <span>Updated {formatRelativeDate(lastActivity)}</span>
      </div>
    </Panel>
  );
}
