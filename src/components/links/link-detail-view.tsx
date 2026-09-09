import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LinkDetailBody } from "@/components/links/link-detail-body";
import { requireUserId } from "@/lib/auth/session";
import { getAiInsightRepository, getLinkRepository, getProjectRepository } from "@/lib/data";

export async function LinkDetailView({ id }: { id: string }) {
  await connection();
  const userId = await requireUserId();

  const link = await getLinkRepository().forUser(userId).get(id);
  if (!link) notFound();

  const project = link.projectId
    ? await getProjectRepository().forUser(userId).get(link.projectId)
    : null;
  // No ownership check needed here beyond the one above: this repository
  // has no userId column at all (see `lib/db/schema/ai-insights.ts`) — it's
  // reached only through a linkId already proven to belong to `userId`.
  const aiInsight = await getAiInsightRepository().getByLinkId(id);

  return <LinkDetailBody link={link} project={project} aiInsight={aiInsight} />;
}
