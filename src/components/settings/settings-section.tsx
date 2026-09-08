import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils/cn";

export interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  /** Shown next to the title for sections with no real functionality yet. */
  badge?: string;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  badge,
  className,
}: SettingsSectionProps) {
  return (
    <Panel className={cn("overflow-hidden", className)}>
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {badge ? (
            <span className="rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-medium text-ink-subtle">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </Panel>
  );
}

export interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

/** One labelled control inside a `SettingsSection`. */
export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
