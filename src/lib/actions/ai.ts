"use server";

import { revalidatePath } from "next/cache";

import { processLinkAi } from "@/lib/ai/ai-service";
import { isAiConfigured } from "@/lib/ai/openai-client";
import { requireUserIdForAction } from "@/lib/auth/session";
import { getAiInsightRepository, getLinkRepository } from "@/lib/data";
import type { AiInsight } from "@/lib/domain/types";
import { extractMetadata } from "@/lib/metadata";

import { err, ok, type ActionResult } from "./result";

/**
 * "Regenerate AI" on the link detail page — the only user-facing way to
 * redo AI analysis. Ownership is verified the same way every other link
 * action in this app verifies it: `getLinkRepository().forUser(userId).get(id)`
 * returns `null` both when the link doesn't exist and when it belongs to
 * another user, so there is nothing here that could reveal or touch another
 * user's link — never a second, ad-hoc ownership check.
 *
 * Refetches the page (via the same `extractMetadata` the original save
 * used) rather than reusing whatever HTML happened to be fetched at save
 * time — a deliberate, rate-limited, user-initiated click is exactly the
 * case where re-fetching is worth it (the page may have changed, or the
 * first fetch may be what failed).
 */
const REGENERATE_COOLDOWN_MS = 15_000;

export async function regenerateAiInsights(linkId: string): Promise<ActionResult<AiInsight>> {
  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  if (!isAiConfigured()) {
    return err("AI processing isn't configured for this app.");
  }

  const link = await getLinkRepository().forUser(auth.userId).get(linkId);
  if (!link) return err("This link no longer exists.");

  const repo = getAiInsightRepository();
  const existing = await repo.getByLinkId(linkId);

  if (existing?.status === "processing") {
    return err("AI analysis is already in progress.");
  }
  if (existing && Date.now() - new Date(existing.updatedAt).getTime() < REGENERATE_COOLDOWN_MS) {
    return err("Please wait a moment before regenerating again.");
  }
  if (!existing) {
    await repo.insertPending(linkId);
  }

  const metadataResult = await extractMetadata(link.url);
  const html = metadataResult.ok ? metadataResult.html : null;

  const result = await processLinkAi(
    linkId,
    { url: link.url, title: link.title, description: link.description, domain: link.domain, html },
    { regenerate: true },
  );

  if (!result) {
    // `processLinkAi` returns null both when it lost the concurrency race
    // and when the attempt failed — re-read to report whichever actually
    // happened, rather than guessing.
    const current = await repo.getByLinkId(linkId);
    if (current?.status === "failed") return err("AI processing failed. Try again.");
    return err("AI analysis is already in progress.");
  }

  revalidatePath(`/links/${linkId}`);
  return ok(result);
}
