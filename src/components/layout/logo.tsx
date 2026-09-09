import Link from "next/link";

import { SITE } from "@/config/site";
import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  /** Set false for a collapsed sidebar, where only the mark fits. */
  showWordmark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-md focus-visible:outline-offset-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-base font-bold text-accent-contrast"
      >
        L
      </span>
      {showWordmark ? (
        <span className="text-lg font-bold tracking-tight text-ink">{SITE.name}</span>
      ) : null}
    </Link>
  );
}
