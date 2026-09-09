"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils/cn";

/**
 * An accessible dropdown menu.
 *
 * Hand-rolled rather than pulling in a headless UI library, because the app
 * needs exactly one menu pattern and the behaviour is well-specified:
 * roving focus with the arrow keys, Escape to dismiss, click-outside to close,
 * and focus returned to the trigger on close.
 *
 * Focus is managed by querying the rendered `[role="menuitem"]` elements rather
 * than by making every item register itself. That keeps the item components
 * trivial and lets callers freely interleave labels and separators.
 */

interface DropdownContextValue {
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export interface DropdownTriggerProps {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
}

export interface DropdownMenuProps {
  /** Render prop for the control that opens the menu. */
  trigger: (props: DropdownTriggerProps) => ReactNode;
  children: ReactNode;
  /** Which edge of the trigger the menu aligns to. */
  align?: "start" | "end";
  /**
   * Preferred side of the trigger the menu opens toward. Defaults to below
   * the trigger. This is only a preference — the menu measures the actual
   * space available above and below the trigger each time it opens and
   * flips to the other side when the preferred one doesn't fit, the same
   * way a native `<select>` does. Pass "top" for a trigger known to sit near
   * the bottom of the viewport (e.g. the sidebar's account menu), so it
   * opens upward by default instead of only flipping as a last resort.
   */
  side?: "bottom" | "top";
  /** Accessible name for the menu itself. */
  label?: string;
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  side = "bottom",
  label = "Menu",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  /**
   * Viewport-relative placement, computed fresh each time the menu opens.
   * `null` on the first render of an open menu — before layout runs, the menu
   * is invisible rather than guessing a position, so it never flashes in the
   * wrong place before the real one is measured.
   */
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
    maxHeight?: number;
  } | null>(null);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Where to put focus once the menu opens: first item, or last. */
  const pendingFocus = useRef<"first" | "last">("first");

  /**
   * Position the menu in viewport coordinates (`position: fixed`) rather
   * than anchoring it with `top-full`/`bottom-full` inside a relatively
   * positioned trigger wrapper. A trigger near an edge of the screen (the
   * sidebar's account menu at the bottom, a link row's "..." menu on the
   * last visible row) doesn't have room on its preferred side, and simply
   * flipping to the other side isn't enough — a tall menu (this one has a
   * dozen-plus items) can still overflow the *opposite* edge. So this always
   * clamps the final position within the viewport, with a small margin, and
   * only as a last resort (menu taller than the viewport itself) caps its
   * height and lets it scroll internally.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;

    const margin = 8;
    const gap = 6;
    const menuRect = menu.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;

    const resolvedSide: "top" | "bottom" =
      side === "bottom"
        ? menuRect.height > spaceBelow && spaceAbove > spaceBelow
          ? "top"
          : "bottom"
        : menuRect.height > spaceAbove && spaceBelow > spaceAbove
          ? "bottom"
          : "top";

    const availableHeight = resolvedSide === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight =
      menuRect.height > availableHeight ? Math.max(availableHeight, 120) : undefined;
    const menuHeight = maxHeight ?? menuRect.height;

    const rawTop =
      resolvedSide === "bottom" ? triggerRect.bottom + gap : triggerRect.top - gap - menuHeight;
    const top = Math.min(Math.max(rawTop, margin), viewportHeight - margin - menuHeight);

    const rawLeft = align === "end" ? triggerRect.right - menuRect.width : triggerRect.left;
    const left = Math.min(Math.max(rawLeft, margin), viewportWidth - margin - menuRect.width);

    setPlacement({ top, left, maxHeight });
  }, [open, side, align]);

  const getItems = useCallback((): HTMLElement[] => {
    const nodes = menuRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    );
    return nodes ? Array.from(nodes) : [];
  }, []);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Move focus into the menu as soon as it renders.
  useEffect(() => {
    if (!open) return;
    const items = getItems();
    if (items.length === 0) return;
    const target =
      pendingFocus.current === "last" ? items[items.length - 1] : items[0];
    target.focus();
  }, [open, getItems]);

  // Dismiss on a click anywhere outside the menu, without stealing focus back.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const openWith = (focus: "first" | "last") => {
    pendingFocus.current = focus;
    setOpen(true);
  };

  const onTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openWith("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openWith("last");
    }
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getItems();
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        items[next].focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const previous =
          currentIndex < 0
            ? items.length - 1
            : (currentIndex - 1 + items.length) % items.length;
        items[previous].focus();
        break;
      }
      case "Home":
        event.preventDefault();
        items[0].focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1].focus();
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        // Tabbing out of a menu dismisses it and lets focus continue onward.
        close(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      {trigger({
        ref: triggerRef,
        onClick: () => (open ? close() : openWith("first")),
        onKeyDown: onTriggerKeyDown,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
      })}

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={
            placement
              ? {
                  top: placement.top,
                  left: placement.left,
                  maxHeight: placement.maxHeight,
                  overflowY: placement.maxHeight ? "auto" : undefined,
                }
              : { top: 0, left: 0, visibility: "hidden" }
          }
          className={cn(
            "fixed z-50 min-w-[11rem] rounded-xl border border-border",
            "bg-surface p-1 shadow-overlay",
            // A short fade keeps the menu from appearing to teleport.
            "animate-in",
          )}
        >
          <DropdownContext.Provider value={{ close }}>
            {children}
          </DropdownContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

export interface DropdownMenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  /** Marks the item as the current value, e.g. the active status. */
  selected?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  /** Renders the item as a navigation link instead of an action button. */
  href?: string;
  className?: string;
}

export function DropdownMenuItem({
  children,
  onSelect,
  icon,
  selected = false,
  disabled = false,
  destructive = false,
  href,
  className,
}: DropdownMenuItemProps) {
  const context = useContext(DropdownContext);

  const itemClassName = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[0.8125rem]",
    "transition-colors outline-none",
    disabled
      ? "cursor-not-allowed text-ink-subtle"
      : destructive
        ? "text-danger hover:bg-danger/10 focus-visible:bg-danger/10"
        : "text-ink hover:bg-surface-hover focus-visible:bg-surface-hover",
    className,
  );

  const content = (
    <>
      {icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center text-ink-subtle">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
      ) : null}
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        role="menuitem"
        tabIndex={-1}
        onClick={() => context?.close()}
        className={itemClassName}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      // Roving focus: the menu container decides which item is focusable.
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        context?.close();
      }}
      className={itemClassName}
    >
      {content}
    </button>
  );
}

/** A non-interactive grouping label inside a menu. */
export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="label-eyebrow px-2.5 pt-2 pb-1.5 text-[0.625rem]">
      {children}
    </p>
  );
}

export function DropdownMenuSeparator() {
  return <hr className="my-1 border-t border-border" aria-hidden="true" />;
}
