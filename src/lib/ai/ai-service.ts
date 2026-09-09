import "server-only";

import OpenAI from "openai";

import { getAiInsightRepository } from "@/lib/data";
import type { AiInsight } from "@/lib/domain/types";

import { extractPageText } from "./extract-page-text";
import { getConfiguredModel, getOpenAiClient, isAiConfigured } from "./openai-client";
import { buildUserContent, DEVELOPER_INSTRUCTIONS, PROMPT_VERSION } from "./prompt";
import { AI_INSIGHT_JSON_SCHEMA, AI_INSIGHT_SCHEMA_NAME, validateAiResult } from "./schema";

/**
 * The one place `openai.responses.create` is called. Everything above this
 * module (`lib/services/link-service.ts`'s automatic trigger,
 * `lib/actions/ai.ts`'s regenerate action) only ever calls `processLinkAi`
 * — never the OpenAI client directly, never a second implementation of this
 * pipeline. See `docs/ARCHITECTURE.md`'s "AI enrichment" section for the
 * full design (prompt-injection protection, cost controls, data sent/not
 * sent, Vercel execution model).
 */

/** Bounds visible + reasoning output tokens for one attempt — see this module's cost-control notes below. */
const MAX_OUTPUT_TOKENS = 1200;

export interface AiProcessingContext {
  url: string;
  title: string;
  description: string;
  domain: string;
  /** The same HTML `extractMetadata` already fetched, or `null` if that fetch failed/never ran. */
  html: string | null;
}

/**
 * A coarse, safe failure category — never a raw error message or stack
 * trace, mirroring `lib/metadata/types.ts`'s `MetadataFailureReason`.
 */
export type AiFailureReason =
  | "rate-limited"
  | "timeout"
  | "network-error"
  | "invalid-response"
  | "unknown";

/**
 * Runs one AI processing attempt for `linkId` and persists the result.
 * Never throws — every failure path ends in `markFailed`, so a caller (the
 * `after()` callback in `link-service.ts`, or the `regenerateAiInsights`
 * Server Action) never needs its own try/catch around this.
 *
 * The atomic `tryStartProcessing` compare-and-swap is what prevents two
 * concurrent calls (the automatic attempt racing a fast "Regenerate" click,
 * or a double-click) from both reaching OpenAI — a caller that loses the
 * race gets `null` back and returns immediately, spending nothing.
 */
export async function processLinkAi(
  linkId: string,
  context: AiProcessingContext,
  options: { regenerate?: boolean } = {},
): Promise<AiInsight | null> {
  if (!isAiConfigured()) return null;

  const repo = getAiInsightRepository();
  // The automatic path (`regenerate` unset) may only claim a `"pending"` or
  // `"failed"` row — it must never reprocess (and so never overwrite) a
  // link that already has a completed result. Only a deliberate,
  // user-triggered regenerate is allowed to do that — see
  // `repository.ts`'s doc comments on these two methods.
  const claimed = options.regenerate
    ? await repo.tryStartRegeneration(linkId)
    : await repo.tryStartProcessing(linkId);
  if (!claimed) return null;

  try {
    const pageText = context.html ? extractPageText(context.html) : null;
    const model = getConfiguredModel();

    const response = await getOpenAiClient().responses.create({
      model,
      input: [
        { role: "developer", content: DEVELOPER_INSTRUCTIONS },
        { role: "user", content: buildUserContent({ ...context, pageText }) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: AI_INSIGHT_SCHEMA_NAME,
          schema: AI_INSIGHT_JSON_SCHEMA,
          strict: true,
        },
        verbosity: "low",
      },
      // Luna is a reasoning model; low effort keeps latency/cost down for a
      // task this simple — see openai-client.ts's cost-control notes.
      reasoning: { effort: "low" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
    });

    logUsage(linkId, model, response.usage);

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.output_text);
    } catch {
      return failAndReturn(linkId, "invalid-response");
    }

    const validated = validateAiResult(parsed);
    if (!validated) {
      return failAndReturn(linkId, "invalid-response");
    }

    return await repo.markCompleted(linkId, { ...validated, model, promptVersion: PROMPT_VERSION });
  } catch (error) {
    return failAndReturn(linkId, classifyError(error));
  }
}

async function failAndReturn(linkId: string, reason: AiFailureReason): Promise<null> {
  await getAiInsightRepository().markFailed(linkId, reason);
  return null;
}

function classifyError(error: unknown): AiFailureReason {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (error instanceof OpenAI.RateLimitError) return "rate-limited";
  if (error instanceof OpenAI.APIConnectionError) return "network-error";
  return "unknown";
}

/**
 * Non-sensitive diagnostics only — model name, token counts, which link.
 * Never the prompt, never the response content, never anything user-typed.
 * Server-side console output only; nothing here is returned to a client.
 */
function logUsage(linkId: string, model: string, usage: unknown): void {
  const u = usage as { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined;
  console.log(
    `[ai] linkId=${linkId} model=${model} input_tokens=${u?.input_tokens ?? "?"} output_tokens=${u?.output_tokens ?? "?"} total_tokens=${u?.total_tokens ?? "?"}`,
  );
}
