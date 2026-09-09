/**
 * The one schema shared by two consumers: it's sent to OpenAI as the
 * structured-output contract (`text.format` in `ai-service.ts`), and its
 * bounds (`minItems`/`maxItems`) are re-checked by `validateAiResult` below
 * against the actual parsed response — `strict:true` on the OpenAI side
 * already constrains *shape*, but this app never trusts model output for
 * *content* without its own check (the brief is explicit about this).
 *
 * Field targets (brief's section 16-20): summary 2-5 sentences, 3-8 topics,
 * 3-7 key points. JSON Schema can't express "N sentences," so the prompt
 * carries that guidance; the schema enforces what it can (array bounds, a
 * generous but real character ceiling on `summary` as defense-in-depth
 * against a runaway response).
 */
export const AI_INSIGHT_SCHEMA_NAME = "link_ai_insight";

const MAX_SUMMARY_CHARS = 1000;
const MAX_TOPIC_CHARS = 60;
const MAX_KEY_POINT_CHARS = 300;
const MAX_CATEGORY_CHARS = 40;
const MAX_CONTENT_TYPE_CHARS = 40;

export const AI_INSIGHT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", maxLength: MAX_SUMMARY_CHARS },
    category: { type: "string", maxLength: MAX_CATEGORY_CHARS },
    topics: {
      type: "array",
      items: { type: "string", maxLength: MAX_TOPIC_CHARS },
      minItems: 3,
      maxItems: 8,
    },
    keyPoints: {
      type: "array",
      items: { type: "string", maxLength: MAX_KEY_POINT_CHARS },
      minItems: 3,
      maxItems: 7,
    },
    contentType: { type: "string", maxLength: MAX_CONTENT_TYPE_CHARS },
  },
  required: ["summary", "category", "topics", "keyPoints", "contentType"],
} as const;

export interface AiInsightPayload {
  summary: string;
  category: string;
  topics: string[];
  keyPoints: string[];
  contentType: string;
}

/**
 * Re-validates a parsed model response against the same bounds given to
 * OpenAI. Returns `null` for anything malformed — the caller treats that as
 * a failed attempt (`errorReason: "invalid-response"`), never as partial
 * data to save. Trims whitespace and drops empty array entries defensively;
 * everything else is a hard rejection, not a silent coercion.
 */
export function validateAiResult(value: unknown): AiInsightPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;

  const summary = asBoundedString(candidate.summary, MAX_SUMMARY_CHARS);
  const category = asBoundedString(candidate.category, MAX_CATEGORY_CHARS);
  const contentType = asBoundedString(candidate.contentType, MAX_CONTENT_TYPE_CHARS);
  const topics = asBoundedStringArray(candidate.topics, MAX_TOPIC_CHARS, 3, 8);
  const keyPoints = asBoundedStringArray(candidate.keyPoints, MAX_KEY_POINT_CHARS, 3, 7);

  if (!summary || !category || !contentType || !topics || !keyPoints) return null;

  return { summary, category, topics, keyPoints, contentType };
}

function asBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function asBoundedStringArray(
  value: unknown,
  maxItemLength: number,
  minItems: number,
  maxItems: number,
): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);

  if (items.length < minItems) return null;
  if (items.some((item) => item.length > maxItemLength)) return null;
  return items;
}
