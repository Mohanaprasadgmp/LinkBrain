import type { Priority } from "./types";

export interface PriorityMeta {
  value: Priority;
  label: string;
  hint: string;
  className: string;
  /** Lower sorts first when ordering by priority. */
  weight: number;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  "must-read": {
    value: "must-read",
    label: "Must Read",
    hint: "Get to this soon",
    className: "border-danger/25 bg-danger/10 text-danger",
    weight: 0,
  },
  useful: {
    value: "useful",
    label: "Useful",
    hint: "Worth your time",
    className: "border-accent/25 bg-accent/10 text-accent",
    weight: 1,
  },
  "maybe-later": {
    value: "maybe-later",
    label: "Maybe Later",
    hint: "No rush",
    className: "border-border bg-surface-sunken text-muted",
    weight: 2,
  },
  reference: {
    value: "reference",
    label: "Reference",
    hint: "Keep around to look things up",
    className: "border-info/25 bg-info/10 text-info",
    weight: 3,
  },
};

export const PRIORITY_ORDER: Priority[] = [
  "must-read",
  "useful",
  "maybe-later",
  "reference",
];

export const PRIORITY_OPTIONS: PriorityMeta[] = PRIORITY_ORDER.map(
  (priority) => PRIORITY_META[priority],
);
