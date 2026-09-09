import { PRIORITY_ORDER } from "@/lib/domain/priority";
import { STATUS_ORDER } from "@/lib/domain/status";
import type { NewLinkInput } from "@/lib/domain/types";
import { LINK_INPUT_LIMITS } from "@/lib/services/link-service";

/**
 * Turns an untrusted JSON body (from the extension, over the network) into a
 * `NewLinkInput` — or rejects it. Nothing here is trusted: wrong types,
 * unknown enum values, and oversized strings are all rejected before this
 * ever reaches `createLinkForUser`. `userId` is deliberately not a field
 * this function looks for at all — see `route.ts`'s comment on why an
 * extension-supplied user id is never an authority claim.
 */
export type ParsedLinkRequest = { input: NewLinkInput; force: boolean };
export type ValidationResult =
  | { ok: true; data: ParsedLinkRequest }
  | { ok: false; error: string };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function withinLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function validateLinkRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Malformed request body." };
  }

  const raw = body as Record<string, unknown>;

  if (!isString(raw.url) || raw.url.trim().length === 0) {
    return { ok: false, error: "A url is required." };
  }
  if (!withinLength(raw.url, LINK_INPUT_LIMITS.url)) {
    return { ok: false, error: "That URL is too long." };
  }

  if (raw.title !== undefined && !isString(raw.title)) {
    return { ok: false, error: "title must be a string." };
  }
  if (isString(raw.title) && !withinLength(raw.title, LINK_INPUT_LIMITS.title)) {
    return { ok: false, error: "That title is too long." };
  }

  if (raw.personalNote !== undefined && !isString(raw.personalNote)) {
    return { ok: false, error: "personalNote must be a string." };
  }
  if (isString(raw.personalNote) && !withinLength(raw.personalNote, LINK_INPUT_LIMITS.note)) {
    return { ok: false, error: "That note is too long." };
  }

  if (raw.projectId !== undefined && raw.projectId !== null && !isString(raw.projectId)) {
    return { ok: false, error: "projectId must be a string." };
  }

  if (raw.status !== undefined && !STATUS_ORDER.includes(raw.status as never)) {
    return { ok: false, error: "Invalid status." };
  }

  if (raw.priority !== undefined && !PRIORITY_ORDER.includes(raw.priority as never)) {
    return { ok: false, error: "Invalid priority." };
  }

  if (raw.force !== undefined && typeof raw.force !== "boolean") {
    return { ok: false, error: "force must be a boolean." };
  }

  const input: NewLinkInput = {
    url: raw.url,
    title: isString(raw.title) ? raw.title : "",
    note: isString(raw.personalNote) ? raw.personalNote : undefined,
    projectId: isString(raw.projectId) ? raw.projectId : raw.projectId === null ? null : undefined,
    status: raw.status as NewLinkInput["status"],
    priority: raw.priority as NewLinkInput["priority"],
  };

  return { ok: true, data: { input, force: raw.force === true } };
}
