/**
 * A minimal in-memory sliding-window limiter for `POST /api/extension/links`,
 * keyed by the authenticated user's id (never by IP — the extension always
 * has a resolved user by the time this runs).
 *
 * Known limitation, documented rather than glossed over: this state lives in
 * one server process's memory. It resets on every deploy/restart and isn't
 * shared across serverless instances or regions, so it bounds obviously
 * abusive bursts from a single warm instance rather than providing a real
 * global guarantee. A production-grade limiter needs a shared store (e.g.
 * Upstash/Redis) — real infrastructure, out of scope for this phase.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const requestLog = new Map<string, number[]>();

export function isRateLimited(userId: string, now: number = Date.now()): boolean {
  const timestamps = (requestLog.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(userId, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(userId, timestamps);
  return false;
}
