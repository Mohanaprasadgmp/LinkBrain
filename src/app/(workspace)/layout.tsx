import { connection } from "next/server";

import { AppShell } from "@/components/layout/app-shell";
import { getProjectRepository, getSidebarCounts } from "@/lib/data";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  await connection();

  const [badgeCounts, projects] = await Promise.all([
    getSidebarCounts(),
    getProjectRepository().list(),
  ]);

  return (
    <AppShell badgeCounts={badgeCounts} projects={projects}>
      {children}
    </AppShell>
  );
}
