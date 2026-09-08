import type { ButtonHTMLAttributes, Ref } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * The button primitive.
 *
 * Variants are plain lookup records rather than a class-variance library: the
 * whole matrix is small, and a record keeps it readable and dependency-free.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-contrast hover:bg-accent-hover shadow-raised",
  secondary:
    "border border-border bg-surface text-ink hover:bg-surface-hover hover:border-border-strong shadow-raised",
  ghost: "text-ink-muted hover:bg-surface-hover hover:text-ink",
  subtle: "bg-surface-sunken text-ink hover:bg-surface-hover",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-[0.8125rem]",
  md: "h-9 gap-2 px-3.5 text-sm",
  lg: "h-11 gap-2 px-5 text-[0.9375rem]",
};

const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-lg font-medium " +
  "transition-colors duration-150 select-none " +
  // Disabled buttons stay readable but clearly inert, and stop swallowing clicks.
  "disabled:pointer-events-none disabled:opacity-50";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      // Defaults to "button": a bare <button> inside a form submits it, which
      // is almost never what an action button in this app should do.
      type={type}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "size-7",
  md: "size-9",
  lg: "size-11",
};

export interface IconButtonProps extends ButtonProps {
  /**
   * Accessible name. Required, because an icon-only button has no text for a
   * screen reader to announce.
   */
  label: string;
}

export function IconButton({
  variant = "ghost",
  size = "md",
  label,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        ICON_SIZE_CLASSES[size],
        "p-0",
        className,
      )}
      {...props}
    />
  );
}
