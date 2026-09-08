import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * The empty state shown when a list has nothing to display.
 *
 * Takes an explicit `action` slot because the right next step differs by
 * context: an empty library wants "Add your first link", while an over-filtered
 * list wants "Clear filters".
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-sunken">
        <Icon aria-hidden="true" className="size-5 text-ink-subtle" />
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
