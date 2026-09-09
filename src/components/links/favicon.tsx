"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * A site favicon, real if one was extracted, generated otherwise.
 *
 * `src` is optional and can fail: `onError` flips a local flag rather than
 * unmounting the image, falling back to exactly the initial-tile look
 * Phase 1 always used — so a dead or slow-to-extract favicon degrades to
 * the same appearance a link with no favicon at all has always had, not a
 * broken-image icon.
 *
 * `unoptimized`: favicon URLs come from whatever arbitrary domain the user
 * saved, which can't be pre-declared in `next.config.ts`'s image allowlist —
 * this opts that one image out of Next's optimization pipeline rather than
 * needing an unbounded remote-pattern config or falling back to a bare
 * `<img>` (which forgoes the built-in lazy-loading and layout-shift
 * protections `next/image` otherwise gives for free).
 */
export function Favicon({
  domain,
  src,
  className,
}: {
  domain: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        unoptimized
        onError={() => setFailed(true)}
        className={cn("size-8 shrink-0 rounded-md object-cover", className)}
      />
    );
  }

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
