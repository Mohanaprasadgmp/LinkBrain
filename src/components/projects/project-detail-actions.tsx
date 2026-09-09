"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import type { Project } from "@/lib/domain/types";

/**
 * Wraps `ProjectActionsMenu` with navigation: this page IS the project being
 * edited/deleted, so a delete has to navigate away rather than rely on
 * revalidation alone (which is enough for the Projects list's cards).
 */
export function ProjectDetailActions({ project }: { project: Project }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <ProjectActionsMenu
        project={project}
        onDeleted={() => router.replace("/projects")}
        onError={setError}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
