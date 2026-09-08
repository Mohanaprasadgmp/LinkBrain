import { Compass } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Logo />
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface-sunken">
        <Compass aria-hidden="true" className="size-5 text-ink-subtle" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Page not found</h1>
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist, or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-contrast shadow-raised transition-colors hover:bg-accent-hover"
      >
        Back to your library
      </Link>
    </div>
  );
}
