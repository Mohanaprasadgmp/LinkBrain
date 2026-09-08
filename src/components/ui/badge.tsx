import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * A small inline label.
 *
 * Colour is passed in via `className` by the caller (status and priority both
 * own their palettes in `lib/domain`), so this primitive only owns shape,
 * spacing and type.
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md";
}

export function Badge({ size = "md", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap",
        size === "sm"
          ? "px-1.5 py-0.5 text-[0.6875rem]"
          : "px-2 py-0.5 text-xs",
        // Neutral default, overridable by the caller's colour classes.
        "border-border bg-surface-sunken text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

/** The small leading dot used inside status badges. */
export function BadgeDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full", className)}
    />
  );
}
