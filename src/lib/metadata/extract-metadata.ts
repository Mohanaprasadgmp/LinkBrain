import "server-only";

import { fetchPage } from "./fetch-page";
import { parseHtml } from "./parse-html";
import { applyPrecedence } from "./precedence";
import type { MetadataResult } from "./types";

/**
 * Fetches a URL server-side and extracts a best-effort `PageMetadata`.
 *
 * This is the one function the rest of the app calls; everything else in
 * this module is an implementation detail reached through this seam. A
 * later phase's content-extraction step (feeding the Claude/AI pipeline)
 * can call `fetchPage()` again — or extend this function to return the raw
 * HTML alongside the parsed metadata — without needing to touch the SSRF
 * guard, the parser, or the precedence rules, since those are already
 * separated for exactly that kind of extension.
 */
export async function extractMetadata(url: string): Promise<MetadataResult> {
  const pageResult = await fetchPage(url);
  if (!pageResult.ok) {
    return { ok: false, reason: pageResult.reason };
  }

  try {
    const fields = parseHtml(pageResult.html);
    const metadata = applyPrecedence(fields, pageResult.finalUrl);
    return { ok: true, metadata };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}
