/**
 * Shared between `lib/actions/ai.ts` (the server-side enforcement — the
 * actual guarantee) and `components/links/ai-insights-panel.tsx` (a
 * client-side disabled-button mirror of the same window, so the constraint
 * is visibly enforced instead of only discovered via a rejected click). A
 * plain constants module rather than exporting it from `lib/actions/ai.ts`
 * itself: a `"use server"` file may only export async functions, so a
 * shared value has to live somewhere else.
 */
export const AI_REGENERATE_COOLDOWN_MS = 15_000;
