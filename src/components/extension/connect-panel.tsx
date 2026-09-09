"use client";

import { CheckCircle2, PuzzleIcon, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { getExtensionHandoffToken } from "@/lib/actions/extension";
import type { SessionUser } from "@/lib/auth/session";
import { EXTENSION_IDS } from "@/config/extension";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeading } from "@/components/ui/panel";

/**
 * Minimal shape of the `chrome.runtime.sendMessage` binding Chrome injects
 * into pages matched by the extension's `externally_connectable.matches` —
 * present only when that specific extension is installed. Declared locally
 * rather than pulling `@types/chrome` into the main app: this page only ever
 * calls the one function, and keeping the extension's types out of the web
 * app's compiler scope is exactly the "isolated where practical" split the
 * `extension/` directory follows.
 */
type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
  lastError?: { message?: string };
};

function getChromeRuntime(): ChromeRuntime | null {
  const chrome = (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome;
  return chrome?.runtime?.sendMessage ? chrome.runtime : null;
}

/**
 * `EXTENSION_IDS` (`config/extension.ts`) holds the dev id and, once
 * published, the Chrome-Web-Store-assigned id — normally only one of the
 * two is actually installed in a given browser. `sendMessage` fails with
 * `chrome.runtime.lastError` (no response) for an id that isn't installed,
 * so this tries each in turn and stops at the first real connection,
 * without needing to know in advance which one is running.
 */
function sendConnectMessage(
  runtime: ChromeRuntime,
  extensionId: string,
  token: string,
  user: { id: string; name: string; email: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    runtime.sendMessage(extensionId, { type: "linkbrain:connect", token, user }, (response) => {
      resolve(!runtime.lastError && (response as { ok?: boolean } | undefined)?.ok === true);
    });
  });
}

async function connectToAnyInstalledExtension(
  runtime: ChromeRuntime,
  token: string,
  user: { id: string; name: string; email: string },
): Promise<boolean> {
  for (const extensionId of EXTENSION_IDS) {
    if (await sendConnectMessage(runtime, extensionId, token, user)) return true;
  }
  return false;
}

type ConnectState = "connecting" | "connected" | "not-detected" | "error";

/**
 * Hands the current browser session to the LinkBrain Chrome extension. See
 * `docs/ARCHITECTURE.md`'s "Chrome extension" section for the full design:
 * this is same-browser-tab handoff via `externally_connectable`, not a
 * second sign-in flow — the user is already authenticated by the time this
 * renders (`app/(workspace)/extension/page.tsx`'s `requireUser()`).
 */
export function ConnectPanel({ user }: { user: SessionUser }) {
  const [state, setState] = useState<ConnectState>("connecting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      setState("connecting");

      const runtime = getChromeRuntime();
      if (!runtime) {
        if (!cancelled) setState("not-detected");
        return;
      }

      const handoff = await getExtensionHandoffToken();
      if (!handoff.ok) {
        if (!cancelled) setState("error");
        return;
      }

      const connected = await connectToAnyInstalledExtension(runtime, handoff.token, handoff.user);
      if (!cancelled) setState(connected ? "connected" : "not-detected");
    }

    void connect();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <Panel className="mx-auto max-w-md p-6">
      <SectionHeading eyebrow="Chrome extension" title="Connect LinkBrain" />

      <p className="mt-3 text-sm text-ink-muted">
        Signed in as <span className="font-medium text-ink">{user.email}</span>.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-sunken px-6 py-8 text-center">
        {state === "connecting" ? (
          <>
            <PuzzleIcon aria-hidden="true" className="size-8 text-ink-subtle" />
            <p className="text-sm text-ink-muted">Connecting the extension…</p>
          </>
        ) : null}

        {state === "connected" ? (
          <>
            <CheckCircle2 aria-hidden="true" className="size-8 text-success" />
            <p className="text-sm font-medium text-ink">Extension connected</p>
            <p className="text-xs text-ink-muted">
              You can close this tab and start saving pages from the toolbar.
            </p>
          </>
        ) : null}

        {state === "not-detected" ? (
          <>
            <XCircle aria-hidden="true" className="size-8 text-warning" />
            <p className="text-sm font-medium text-ink">Extension not detected</p>
            <p className="text-xs text-ink-muted">
              Load the LinkBrain extension in Chrome first, then try again.
            </p>
          </>
        ) : null}

        {state === "error" ? (
          <>
            <XCircle aria-hidden="true" className="size-8 text-danger" />
            <p className="text-sm font-medium text-ink">Couldn&rsquo;t connect</p>
            <p className="text-xs text-ink-muted">Something went wrong. Try again.</p>
          </>
        ) : null}

        {state !== "connecting" ? (
          <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
