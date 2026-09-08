"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Reads and writes the `?q=` search parameter.
 *
 * Keeping the query in the URL rather than component state makes a search
 * shareable and correct on back/forward navigation, and means a future server
 * component doing real search can read the same parameter.
 *
 * Calls `useSearchParams`, so per the Next.js 16 docs any component using this
 * hook must be wrapped in a `<Suspense>` boundary or `next build` will fail
 * with a "Missing Suspense boundary" error, even though `next dev` will not
 * surface the problem.
 */
export function useSearchQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const query = searchParams.get("q") ?? "";

  const setQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  return { query, setQuery, isPending };
}
