import { FolderOpen } from "lucide-react";
import { connection } from "next/server";

import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { getProjectLinkStats, getProjectRepository } from "@/lib/data";

export async function ProjectsView() {
  await connection();

  const [projects, stats] = await Promise.all([
    getProjectRepository().list(),
    getProjectLinkStats(),
  ]);

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
              linkCount={stats[project.id]?.count ?? 0}
              lastActivity={stats[project.id]?.lastActivity ?? project.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
