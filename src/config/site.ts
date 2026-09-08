/**
 * Static application metadata.
 *
 * Kept in one module so the name and tagline are never hard-coded into
 * components, page metadata, or documentation copy.
 */
export const SITE = {
  name: "LinkBrain",
  tagline: "Your personal memory for the internet.",
  description:
    "A personal link library: save URLs, organise them into projects and tags, keep notes, and find them again.",
} as const;
