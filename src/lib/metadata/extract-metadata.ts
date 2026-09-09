import "server-only";

import { fetchPage } from "./fetch-page";
import { parseHtml } from "./parse-html";
import { applyPrecedence } from "./precedence";
import type { MetadataResult } from "./types";

/**
 * Fetches a URL server-side and extracts a best-effort `PageMetadata`.
 *
 * This is the one function the rest of the app calls; everything else in
 * this module is an implementation detail reached through this seam. The
 * `ok:true` result's `html` field (Phase 7) is that same fetch's raw body,
 * reused by `lib/ai/ai-service.ts` for AI content extraction — one
 * SSRF-checked, size-limited fetch serves both metadata and AI, never two.
 */
export async function extractMetadata(url: string): Promise<MetadataResult> {
  const pageResult = await fetchPage(url);
  if (!pageResult.ok) {
    return { ok: false, reason: pageResult.reason };
  }

  try {
    const fields = parseHtml(pageResult.html);
    const metadata = applyPrecedence(fields, pageResult.finalUrl);
    return { ok: true, metadata, html: pageResult.html };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}
