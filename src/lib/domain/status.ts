import type { LinkStatus } from "./types";

/**
 * Presentation metadata for each link status, co-located with the union itself
 * so that adding a status is a single-file change.
 *
 * Colours are expressed as theme tokens (see `globals.css`) rather than raw
 * Tailwind palette classes, so both themes stay consistent automatically.
 */
export interface StatusMeta {
  value: LinkStatus;
  label: string;
  /** One-line explanation, used in menus and tooltips. */
  hint: string;
  /** Classes for the status badge. */
  className: string;
  /** Class for the small leading dot. */
  dotClassName: string;
}

export const STATUS_META: Record<LinkStatus, StatusMeta> = {
  saved: {
    value: "saved",
    label: "Saved",
    hint: "Waiting in your inbox",
    className: "border-info/25 bg-info/10 text-info",
    dotClassName: "bg-info",
  },
  reading: {
    value: "reading",
    label: "Reading",
    hint: "Currently working through it",
    className: "border-accent/25 bg-accent/10 text-accent",
    dotClassName: "bg-accent",
  },
  read: {
    value: "read",
    label: "Read",
    hint: "Finished",
    className: "border-success/25 bg-success/10 text-success",
    dotClassName: "bg-success",
  },
  archived: {
    value: "archived",
    label: "Archived",
    hint: "Kept, but out of the way",
    className: "border-border bg-surface-sunken text-muted",
    dotClassName: "bg-muted",
  },
};

/** Every status in the order they should appear in menus and filters. */
export const STATUS_ORDER: LinkStatus[] = [
  "saved",
  "reading",
  "read",
  "archived",
];

export const STATUS_OPTIONS: StatusMeta[] = STATUS_ORDER.map(
  (status) => STATUS_META[status],
);

/**
 * Statuses that count as "not yet read".
 *
 * Used for the Unread summary card and the Inbox view, so that the definition
 * of unread lives in one place.
 */
export const UNREAD_STATUSES: LinkStatus[] = ["saved", "reading"];

export function isUnread(status: LinkStatus): boolean {
  return UNREAD_STATUSES.includes(status);
}
