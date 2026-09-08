"use client";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * A controlled search field with a leading icon and a clear button.
 *
 * Deliberately a plain controlled input rather than something that owns its
 * own debounce or state: callers (`useSearchQuery` consumers, the global
 * search box) decide how the value is stored and when it is committed.
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Accessible name, for the icon-only fields that have no visible label. */
  label?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search your library...",
  className,
  label = "Search",
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "h-9 w-full rounded-lg border border-border bg-surface pr-8 pl-9 text-sm text-ink",
          "placeholder:text-ink-subtle transition-colors hover:border-border-strong",
          // Suppress the native WebKit clear icon so our own button is the only one.
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-0.5 text-ink-subtle hover:text-ink"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
