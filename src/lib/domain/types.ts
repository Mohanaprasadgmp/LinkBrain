/**
 * Core domain model for LinkBrain.
 *
 * These types are the single source of truth for the shape of the data across
 * the whole application. They are deliberately free of any persistence or UI
 * concerns: when a real database is introduced in a later phase, its schema
 * should mirror these types (and the string unions below should map directly
 * onto database enums) rather than the other way around.
 */

/** Where a link sits in the reading workflow. */
export type LinkStatus = "saved" | "reading" | "read" | "archived";

/** How urgently a link deserves attention. */
export type Priority = "must-read" | "useful" | "maybe-later" | "reference";

/**
 * A saved link.
 *
 * `createdAt`/`updatedAt` are ISO 8601 strings rather than `Date` objects so
 * that a link can cross the server/client boundary and be serialised to JSON
 * without a custom transform.
 */
export interface Link {
  id: string;
  url: string;
  /** Hostname without protocol or `www.`, e.g. `docs.aws.amazon.com`. */
  domain: string;
  title: string;
  /** Short human-readable summary. Later phases may populate this from AI. */
  description: string;
  /** Free-form personal note. Empty string when the user has not written one. */
  note: string;
  tags: string[];
  status: LinkStatus;
  priority: Priority;
  isFavorite: boolean;
  /** Id of the owning project, or `null` when the link is unfiled. */
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A named collection of links, e.g. "AWS Learning". */
export interface Project {
  id: string;
  name: string;
  description: string;
  /** Token name from the accent palette, used to colour the project chip. */
  accent: ProjectAccent;
  createdAt: string;
  updatedAt: string;
}

export type ProjectAccent = "violet" | "amber" | "teal" | "rose" | "slate";

/**
 * A tag as presented to the UI.
 *
 * Tags are stored on links as plain strings, so this record is derived rather
 * than persisted. Deriving it keeps tag counts correct for free whenever links
 * change, instead of requiring a denormalised counter to be kept in sync.
 */
export interface Tag {
  /** Lowercase, url-safe identifier, e.g. `dynamodb`. */
  slug: string;
  /** Display form, e.g. `DynamoDB`. */
  label: string;
  linkCount: number;
}

/** The signed-in person. A placeholder until authentication exists. */
export interface User {
  id: string;
  name: string;
  email: string;
  /** Initials shown in the avatar while there is no uploaded image. */
  initials: string;
}

/** Aggregate counts shown on the dashboard summary cards. */
export interface LibraryStats {
  totalLinks: number;
  unread: number;
  favorites: number;
  projects: number;
}

/**
 * The set of criteria any link list can be narrowed by.
 *
 * Every field is optional and an absent field means "do not filter on this".
 * Keeping the filter as a plain serialisable object means the same shape can be
 * read from URL search params today and passed to a database query later.
 */
export interface LinkFilter {
  /** Free-text query matched against title, domain, description and tags. */
  query?: string;
  status?: LinkStatus[];
  priority?: Priority[];
  tags?: string[];
  projectId?: string;
  isFavorite?: boolean;
}

export type LinkSort =
  | "newest"
  | "oldest"
  | "recently-updated"
  | "title"
  | "priority";

/** Fields the user may supply when saving a new link. */
export interface NewLinkInput {
  url: string;
  title: string;
  description?: string;
  note?: string;
  tags?: string[];
  status?: LinkStatus;
  priority?: Priority;
  projectId?: string | null;
  isFavorite?: boolean;
}

/** Fields the user may change on an existing link. */
export type LinkUpdate = Partial<
  Pick<
    Link,
    | "title"
    | "description"
    | "note"
    | "tags"
    | "status"
    | "priority"
    | "projectId"
    | "isFavorite"
    | "url"
  >
>;
