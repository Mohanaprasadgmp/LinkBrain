import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * A raised surface.
 *
 * Used sparingly — the editorial layout prefers hairline dividers to boxed
 * cards — but settings blocks and dialogs need a distinct surface.
 */
export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A titled section with an eyebrow label.
 *
 * Recurs at the top of every list and settings group, so the title/description
 * pairing lives here rather than being re-typed on each page.
 */
export interface SectionHeadingProps {
  title: string;
  description?: string;
  /** Small-caps label above the title. */
  eyebrow?: string;
  /** Right-aligned controls, e.g. a sort menu or "view all" link. */
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  description,
  eyebrow,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-2",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="label-eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="font-display text-xl text-ink sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
