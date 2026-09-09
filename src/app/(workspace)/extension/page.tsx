import type { Metadata } from "next";

import { ConnectPanel } from "@/components/extension/connect-panel";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Connect extension" };

/**
 * The Chrome extension's connect/handoff page. Protected exactly like every
 * other workspace page (`proxy.ts` + `requireUser()`) — an unauthenticated
 * visit (e.g. the extension's own "Open LinkBrain" button) lands on
 * `/sign-in?from=/extension` and returns here after a normal sign-in. See
 * `docs/ARCHITECTURE.md`'s "Chrome extension" section for the full handoff
 * design `ConnectPanel` implements.
 */
export default async function ExtensionConnectPage() {
  const user = await requireUser();
  return <ConnectPanel user={user} />;
}
