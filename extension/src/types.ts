/**
 * Shapes shared between the popup and background script, and mirrored (by
 * hand, deliberately — see `README.md`) against the web app's
 * `app/api/extension/*` response shapes. This file has no dependency on the
 * main Next.js app: the extension compiles standalone.
 */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
}

/** Everything kept in `chrome.storage.local` — see `auth-storage.ts`. */
export interface StoredAuth {
  token: string;
  user: StoredUser;
}

export interface StoredProject {
  id: string;
  name: string;
}

export type LinkStatus = "saved" | "reading" | "read" | "archived";
export type Priority = "must-read" | "useful" | "maybe-later" | "reference";

export interface SavedLinkSummary {
  id: string;
  title: string;
  domain: string;
  status: LinkStatus;
  detailUrl: string;
}

export interface SaveLinkRequest {
  url: string;
  title?: string;
  personalNote?: string;
  projectId?: string | null;
  status?: LinkStatus;
  priority?: Priority;
  force?: boolean;
}

export type SaveLinkResponse =
  | { ok: true; link: SavedLinkSummary; metadataApplied: boolean }
  | { ok: false; error: string; duplicate?: boolean; existingLink?: SavedLinkSummary };

/** The message `ConnectPanel` (web app) sends via `chrome.runtime.sendMessage`. */
export interface ConnectMessage {
  type: "linkbrain:connect";
  token: string;
  user: StoredUser;
}
