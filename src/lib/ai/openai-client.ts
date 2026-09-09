import "server-only";

import OpenAI from "openai";

/**
 * The one place `OPENAI_API_KEY` is read and the one place an `OpenAI`
 * client is constructed — `import "server-only"` makes it a build error for
 * any client component (or, transitively, the Chrome extension's bundle,
 * which never imports server code at all) to pull this in, the same
 * guarantee `lib/db/index.ts` gives `DATABASE_URL`.
 *
 * Lazy + cached, mirroring `getDb()`'s pattern exactly, for the same reason:
 * nothing should construct this — and therefore require `OPENAI_API_KEY` —
 * merely by importing this module, only by actually calling `getOpenAiClient()`.
 *
 * `timeout`/`maxRetries` are set here, once, rather than per-call: a single
 * automatic AI attempt (see `lib/ai/ai-service.ts`) should fail fast and
 * cheaply rather than hang or silently retry many times — the SDK's own
 * default is `maxRetries: 2`, which we narrow to 1 (still bounded, still
 * only for transient network/5xx errors within this one attempt, not the
 * "automatic retry" the brief is warning against).
 */
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SDK_RETRIES = 1;

let client: OpenAI | undefined;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_SDK_RETRIES,
    });
  }
  return client;
}

/** `OPENAI_MODEL` with the brief's specified cost-conscious default — never hardcoded elsewhere. */
export function getConfiguredModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
}
