import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * One summary metric on the dashboard.
 *
 * A thin coloured rule on the left edge (rather than a full tinted background)
 * carries the accent without turning four cards into four blocks of colour.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "accent",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: "accent" | "success" | "warning" | "info";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-raised",
        "border-l-[3px]",
        {
          accent: "border-l-accent",
          success: "border-l-success",
          warning: "border-l-warning",
          info: "border-l-info",
        }[accent],
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          {
            accent: "bg-accent/10 text-accent",
            success: "bg-success/10 text-success",
            warning: "bg-warning/10 text-warning",
            info: "bg-info/10 text-info",
          }[accent],
        )}
      >
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none text-ink tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
