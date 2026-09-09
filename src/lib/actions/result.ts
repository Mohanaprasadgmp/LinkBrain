/**
 * The shape every Server Action in `lib/actions` returns.
 *
 * One shared type instead of nine ad-hoc `{ success, error }` shapes, so
 * every caller can handle "did it work" the same way.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/**
 * Returns just the error branch, not the full `ActionResult<never>` union —
 * that union's unreachable `{ ok: true; data: never }` member would make this
 * fail to satisfy any caller (like `createLink`'s `CreateLinkResult`) whose
 * success branch carries extra required fields beyond `data`.
 */
export function err(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Turn a thrown error into a user-presentable message without leaking internals. */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
