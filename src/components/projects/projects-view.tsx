"use client";

import { FolderOpen } from "lucide-react";

import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { countLinksByProject, lastActivityByProject } from "@/lib/links/stats";
import { useLinkStore } from "@/store/link-store";

export function ProjectsView() {
  const { links, projects } = useLinkStore();
  const counts = countLinksByProject(links);
  const lastActivity = lastActivityByProject(links, projects);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Organize"
        title="Projects"
        description="Group related links together, from research to reading lists."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Projects for organizing your links will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              linkCount={counts[project.id] ?? 0}
              lastActivity={lastActivity[project.id] ?? project.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
