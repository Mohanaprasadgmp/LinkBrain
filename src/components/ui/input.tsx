import type {
  InputHTMLAttributes,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

const FIELD_CLASSES =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "hover:border-border-strong " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(FIELD_CLASSES, "h-9", className)} {...props} />;
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(FIELD_CLASSES, "resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>;
}

/**
 * A styled native `<select>`.
 *
 * Native is the right call here: it is fully accessible for free, and on mobile
 * it opens the platform picker, which beats any custom listbox.
 */
export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        FIELD_CLASSES,
        "h-9 cursor-pointer appearance-none pr-8",
        // Chevron drawn as a background image so no wrapper element is needed.
        "bg-[image:var(--select-chevron)] bg-[length:16px] bg-[position:right_0.5rem_center] bg-no-repeat",
        className,
      )}
      style={{
        // `currentColor` cannot be used inside a url(), so the stroke is
        // written to match --ink-subtle in both themes closely enough.
        ["--select-chevron" as string]:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23938a7e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    />
  );
}

/**
 * A labelled form field.
 *
 * Generates and wires up the `id`/`htmlFor` pair (and the `aria-describedby`
 * for the hint) so that every field in the app is correctly labelled without
 * each caller having to remember to do it.
 */
export interface FieldProps {
  label: string;
  hint?: string;
  /** Receives the generated id to spread onto the control. */
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-[0.8125rem] font-medium text-ink"
      >
        {label}
      </label>
      {children({ id, "aria-describedby": hintId })}
      {hint ? (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
