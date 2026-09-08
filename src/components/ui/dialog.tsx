"use client";

import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * A modal dialog: the base for Add Link, Edit Link and any future modal form.
 *
 * Hand-rolled to get exactly three behaviours right, which is the entire
 * contract of an accessible modal:
 *  - focus moves into the dialog on open and is trapped there (Tab wraps)
 *  - Escape closes it, and focus returns to whatever opened it
 *  - the background is inert: `aria-hidden` isn't enough on its own, so the
 *    portal plus a click-blocking overlay stands in for `inert`
 *
 * Rendered through a portal so its stacking context is never fought by an
 * ancestor's `overflow` or `z-index`.
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Rendered in a footer row, typically Cancel/Save buttons. */
  footer?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = `${title.replace(/\s+/g, "-").toLowerCase()}-title`;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element, falling back to the panel itself so
    // Tab/Escape still work even if the body is just static content.
    const focusables = getFocusable(panelRef.current);
    (focusables[0] ?? panelRef.current)?.focus();

    // Lock background scroll while the dialog is up.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusable(panelRef.current);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden",
          "rounded-2xl border border-border bg-surface shadow-overlay",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
            ) : null}
          </div>
          <IconButton
            label="Close dialog"
            size="sm"
            onClick={onClose}
            className="-mt-1"
          >
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}
