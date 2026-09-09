/**
 * Metadata extraction types.
 *
 * Framework-free — no React, no repository, no Server Action shapes — so this
 * module stays reusable when a later phase adds content extraction and
 * Claude processing on top of the same fetch (see `extract-metadata.ts`'s
 * doc comment for how that's expected to slot in).
 */

/** What a page's metadata resolves to, after applying precedence rules. */
export interface PageMetadata {
  title: string | null;
  description: string | null;
  /** Absolute URL, resolved against the page's final (post-redirect) URL. */
  imageUrl: string | null;
  /** Absolute URL, resolved against the page's final (post-redirect) URL. */
  faviconUrl: string | null;
}

export type MetadataResult =
  | { ok: true; metadata: PageMetadata }
  | { ok: false; reason: MetadataFailureReason };

/**
 * Coarse, non-sensitive failure categories — safe to log server-side or (if
 * ever needed) show a user, unlike the underlying error message, which might
 * contain hostnames, stack traces, or other detail not meant to leave the
 * server.
 */
export type MetadataFailureReason =
  | "invalid-url"
  | "blocked-address"
  | "timeout"
  | "too-large"
  | "not-html"
  | "http-error"
  | "network-error"
  | "parse-error";

/** The raw, un-prioritised fields `parse-html.ts` pulls out of a document. */
export interface RawPageFields {
  htmlTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  /** `href` values from every icon-ish `<link>`, in document order. */
  iconLinks: { rel: string; href: string }[];
}
