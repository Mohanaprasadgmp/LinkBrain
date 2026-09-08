import { cn } from "@/lib/utils/cn";

/** A pulsing placeholder block, used as Suspense fallback content. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-surface-sunken", className)}
    />
  );
}

/** The fallback shown while a link-list page's client half streams in. */
export function LinkCollectionSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-4 pt-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
