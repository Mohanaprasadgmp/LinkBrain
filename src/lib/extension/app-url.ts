import "server-only";

/**
 * The app's own base URL, for building absolute links in extension API
 * responses (e.g. "open this saved link"). Reuses `BETTER_AUTH_URL` rather
 * than introducing a second env var — that value is already exactly this
 * app's own base URL (see `.env.example`'s comment on it, and
 * `lib/auth.ts`'s `baseURL`).
 */
export function linkDetailUrl(linkId: string): string {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/links/${linkId}`;
}
