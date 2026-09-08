import { cn } from "@/lib/utils/cn";

/**
 * A generated stand-in for a site favicon.
 *
 * Phase 1 makes no network requests, so there is no real favicon to fetch.
 * Rendering the domain's first letter on a colour derived from the domain
 * string gives each site a stable, distinguishable mark instead of a single
 * generic globe icon repeated on every card.
 */
export function Favicon({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const letter = (domain.replace(/^\d+/, "")[0] ?? "?").toUpperCase();
  const hue = hashToHue(domain);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: `oklch(58% 0.1 ${hue})` }}
    >
      {letter}
    </span>
  );
}

/** Deterministically map a string to a hue in [0, 360), so it never varies across renders. */
function hashToHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}
