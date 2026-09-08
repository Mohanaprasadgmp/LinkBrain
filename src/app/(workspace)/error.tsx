"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/**
 * Page-level error boundary for everything inside the workspace shell.
 *
 * Narrower than `app/error.tsx`: this only catches a failure in a single
 * page's own data fetch (e.g. one page's repository query), so the sidebar,
 * top bar, and navigation — already rendered successfully by
 * `(workspace)/layout.tsx` — stay usable around the error instead of the
 * whole app disappearing.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-danger/25 bg-danger/10">
        <AlertTriangle aria-hidden="true" className="size-5 text-danger" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-ink">
          This page couldn&rsquo;t load
        </h2>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          Something went wrong fetching this data. Try again, or use the
          sidebar to go somewhere else.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-ink shadow-raised transition-colors hover:bg-surface-hover"
      >
        Try again
      </button>
    </div>
  );
}
