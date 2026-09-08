import type { ProjectAccent } from "@/lib/domain/types";

/**
 * Derive a project's accent colour deterministically from its id.
 *
 * `accent` is presentation-only (which colour `ProjectCard` tints its icon
 * chip) and isn't one of the columns Phase 2's schema stores — rather than
 * add a column for a purely cosmetic value, it's computed the same way
 * `Favicon` derives a colour from a domain string: a stable hash into a
 * small fixed palette, so a given project always renders the same colour
 * without persisting it.
 */
const ACCENTS: ProjectAccent[] = ["violet", "amber", "teal", "rose", "slate"];

export function pickProjectAccent(seed: string): ProjectAccent {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % ACCENTS.length;
  }
  return ACCENTS[Math.abs(hash)];
}
