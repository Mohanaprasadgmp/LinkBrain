import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getProjectRepository, getSidebarCounts } from "@/lib/data";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  await connection();

  // The workspace's own auth gate — `proxy.ts` already redirects an
  // obviously signed-out visitor before this ever runs, but this is the
  // authoritative, database-backed check every workspace page sits behind.
  // `getCurrentUser()` is `cache()`-wrapped (see `lib/auth/session.ts`), so
  // this is the same session lookup every other call in this request reuses,
  // not a second database round trip.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [badgeCounts, projects] = await Promise.all([
    getSidebarCounts(user.id),
    getProjectRepository().forUser(user.id).list(),
  ]);

  return (
    <AppShell badgeCounts={badgeCounts} projects={projects} user={user}>
      {children}
    </AppShell>
  );
}
