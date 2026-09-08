"use client";

import { useSyncExternalStore } from "react";

import { CURRENT_USER } from "@/lib/data/fixtures/user";
import { greetingForHour } from "@/lib/utils/date";

/**
 * The dashboard's greeting.
 *
 * The greeting depends on the visitor's local hour, which the server cannot
 * know — computing it during render would render one thing on the server and
 * (likely) another on the client, a hydration mismatch. `useSyncExternalStore`
 * is the tool React provides for exactly this: it renders `getServerSnapshot`
 * during hydration so the first paint matches the server, then immediately
 * re-renders with the real client value — without an effect calling
 * `setState`, which achieves the same end but via an extra, separately
 * scheduled render.
 *
 * The greeting doesn't need to live-update as the hour ticks over during a
 * session, so `subscribe` never actually notifies; the snapshot is read once,
 * right after hydration.
 */
function subscribe() {
  return () => {};
}

function getSnapshot(): string {
  return greetingForHour(new Date().getHours());
}

function getServerSnapshot(): string {
  return "Welcome back";
}

export function GreetingHeader() {
  const greeting = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const firstName = CURRENT_USER.name.split(" ")[0];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink sm:text-display">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Here&rsquo;s what&rsquo;s waiting in your library.
      </p>
    </div>
  );
}
