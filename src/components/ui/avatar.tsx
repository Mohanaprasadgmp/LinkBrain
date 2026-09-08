import { cn } from "@/lib/utils/cn";

/**
 * An initials avatar.
 *
 * There is no image upload yet, so initials on a tinted ground are the whole
 * implementation. When real avatars arrive this becomes the fallback.
 */
export interface AvatarProps {
  initials: string;
  size?: "sm" | "md";
  className?: string;
}

export function Avatar({ initials, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-accent/12 font-medium text-accent",
        size === "sm" ? "size-6 text-[0.625rem]" : "size-8 text-xs",
        className,
      )}
    >
      {initials}
    </span>
  );
}
