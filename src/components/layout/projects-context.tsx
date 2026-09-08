"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Project } from "@/lib/domain/types";

/**
 * A read-only list of every project, for the Add/Edit Link dialogs' project
 * picker.
 *
 * This is deliberately not a reducer or mutable store — it holds no
 * mutation logic at all. Projects are fetched once per request by the
 * workspace layout (alongside the sidebar's badge counts) and handed down via
 * Context rather than threaded as a prop through every page's view component
 * down to whichever dialog happens to be open; mutations still go entirely
 * through Server Actions + `revalidatePath`, which is what keeps this list
 * from ever going stale for longer than a navigation.
 */
const ProjectsContext = createContext<Project[] | null>(null);

export function ProjectsProvider({
  projects,
  children,
}: {
  projects: Project[];
  children: ReactNode;
}) {
  return (
    <ProjectsContext.Provider value={projects}>{children}</ProjectsContext.Provider>
  );
}

export function useProjects(): Project[] {
  const context = useContext(ProjectsContext);
  if (context === null) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
