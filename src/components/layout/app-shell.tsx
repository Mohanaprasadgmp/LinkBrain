import { ProjectsProvider } from "@/components/layout/projects-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { SessionUser } from "@/lib/auth/session";
import type { SidebarCounts } from "@/lib/data";
import type { Project } from "@/lib/domain/types";

/**
 * The workspace chrome: sidebar (desktop) + topbar, wrapping every route
 * inside the `(workspace)` route group.
 *
 * No longer wraps children in a client store provider — link/project data is
 * fetched server-side per page now (see each page's view component). The two
 * pieces of link-derived data the shell itself needs — sidebar badge counts,
 * and the project list the Add/Edit Link dialogs need for their picker — are
 * fetched once by the layout and passed down (`badgeCounts` as a plain prop,
 * `projects` via `ProjectsProvider` since dialogs opened deep inside a page's
 * own tree need it too).
 */
export function AppShell({
  children,
  badgeCounts,
  projects,
  user,
}: {
  children: React.ReactNode;
  badgeCounts: SidebarCounts;
  projects: Project[];
  user: SessionUser;
}) {
  return (
    <ProjectsProvider projects={projects}>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <Sidebar badgeCounts={badgeCounts} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar badgeCounts={badgeCounts} user={user} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProjectsProvider>
  );
}
