"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/**
 * Root error boundary.
 *
 * Catches anything that throws above the workspace shell — most likely
 * `app/(workspace)/layout.tsx` itself, which fetches sidebar counts and the
 * project list before any page can render (a broken `DATABASE_URL` or an
 * unreachable database surfaces here). The root `layout.tsx` (fonts, theme)
 * stays mounted around this boundary, so the page keeps its normal look
 * rather than falling back to an unstyled browser error page.
 *
 * `app/(workspace)/error.tsx` is the narrower sibling of this file: it
 * catches a single page's own failure while leaving a working sidebar
 * around it, for when the shell loaded fine but one page's query didn't.
 */
export default function GlobalError({
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-danger/25 bg-danger/10">
        <AlertTriangle aria-hidden="true" className="size-5 text-danger" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Couldn&rsquo;t load your library
        </h1>
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
          Something went wrong reaching the database. This usually clears up
          on its own — try again in a moment.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-contrast shadow-raised transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
