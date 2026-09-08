import Link from "next/link";

import { SITE } from "@/config/site";
import { cn } from "@/lib/utils/cn";

export function Logo({ className }: { className?: string }) {
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
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-base text-accent-contrast"
      >
        L
      </span>
      <span className="font-display text-lg text-ink">{SITE.name}</span>
    </Link>
  );
}
