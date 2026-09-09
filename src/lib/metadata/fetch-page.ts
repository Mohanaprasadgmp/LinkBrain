import "server-only";

import { promises as dns } from "node:dns";

import { isAllowedProtocol, isBlockedIp, isObviouslyLocalHostname } from "./ssrf-guard";
import type { MetadataFailureReason } from "./types";

/**
 * The safe-fetch primitive: validates a target before connecting (and before
 * following every redirect hop), bounds time and size, and returns raw HTML
 * or a coarse failure reason — never a raw error message, which might carry
 * internal detail this module has no business surfacing.
 */

const TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_REDIRECTS = 5;
const USER_AGENT =
  "LinkBrainBot/1.0 (+https://github.com/Mohanaprasadgmp/LinkBrain) metadata-preview-fetcher";

export type FetchPageResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; reason: MetadataFailureReason };

/** Protocol + DNS-resolution checks. Called before the initial request and again before each redirect. */
async function rejectionReasonFor(url: URL): Promise<MetadataFailureReason | null> {
  if (!isAllowedProtocol(url.protocol)) return "invalid-url";
  if (isObviouslyLocalHostname(url.hostname)) return "blocked-address";

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    return "network-error";
  }

  if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
    return "blocked-address";
  }

  return null;
}

export async function fetchPage(rawUrl: string): Promise<FetchPageResult> {
  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const rejection = await rejectionReasonFor(currentUrl);
      if (rejection) return { ok: false, reason: rejection };

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
          },
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { ok: false, reason: "timeout" };
        }
        return { ok: false, reason: "network-error" };
      }

      // Redirects are followed manually so the new target gets the same
      // protocol + DNS validation as the original URL — this is what stops
      // a public URL from redirecting to an internal address.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { ok: false, reason: "network-error" };
        try {
          currentUrl = new URL(location, currentUrl);
        } catch {
          return { ok: false, reason: "network-error" };
        }
        continue;
      }

      if (!response.ok) {
        return { ok: false, reason: "http-error" };
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !/html/i.test(contentType)) {
        return { ok: false, reason: "not-html" };
      }

      const html = await readBodyWithLimit(response, MAX_RESPONSE_BYTES);
      if (html === null) return { ok: false, reason: "too-large" };

      return { ok: true, html, finalUrl: currentUrl.toString() };
    }

    return { ok: false, reason: "network-error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads the body incrementally, aborting once `maxBytes` is exceeded, rather
 * than trusting `Content-Length` (absent or wrong on plenty of real servers).
 */
async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  if (!response.body) {
    return response.text().catch(() => null);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}
