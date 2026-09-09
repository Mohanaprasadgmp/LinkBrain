"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * An avatar: a real image when one is available (e.g. a Google profile
 * picture), initials on a tinted ground otherwise — and the same initials
 * fallback if the image fails to load, the same `onError`-flips-a-flag
 * pattern `Favicon` already uses for exactly this reason. `unoptimized`:
 * profile image URLs come from whatever provider supplied them, which can't
 * be pre-declared in `next.config.ts`'s image allowlist.
 */
export interface AvatarProps {
  initials: string;
  src?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "size-6 text-[0.625rem]",
  md: "size-8 text-xs",
} as const;

export function Avatar({ initials, src, size = "md", className }: AvatarProps) {
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
        className={cn("shrink-0 rounded-full object-cover", SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-accent/12 font-medium text-accent",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
