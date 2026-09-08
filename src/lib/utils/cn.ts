import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names, resolving conflicts in favour of the last one.
 *
 * This lets components expose a `className` prop that can genuinely override
 * their own defaults (e.g. passing `px-6` beats a built-in `px-3`), which is
 * what makes the primitives in `components/ui` reusable.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
