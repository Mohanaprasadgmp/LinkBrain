import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LinkDetailBody } from "@/components/links/link-detail-body";
import { requireUserId } from "@/lib/auth/session";
import { getLinkRepository, getProjectRepository } from "@/lib/data";

export async function LinkDetailView({ id }: { id: string }) {
  await connection();
  const userId = await requireUserId();

  const link = await getLinkRepository().forUser(userId).get(id);
  if (!link) notFound();

  const project = link.projectId
    ? await getProjectRepository().forUser(userId).get(link.projectId)
    : null;

  return <LinkDetailBody link={link} project={project} />;
}
