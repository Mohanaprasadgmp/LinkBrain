"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { SearchInput } from "@/components/search/search-input";
import { useSearchQuery } from "@/hooks/use-search-query";

/**
 * The search field in the top bar, present on every page.
 *
 * On the All Links page it is directly bound to `?q=` via `useSearchQuery`,
 * filtering that page's list live. On any other page, typing acts as a
 * launcher: submitting (or continuing to type) navigates to All Links with the
 * query attached, since that is the page with the full filtering UI.
 *
 * Calls `useSearchParams` (through `useSearchQuery`), so per the Next.js 16
 * docs this component must sit under a `<Suspense>` boundary or `next build`
 * fails with a "Missing Suspense boundary" error — see `Topbar`.
 */
export function GlobalSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const onLinksPage = pathname === "/links";

  const { query, setQuery } = useSearchQuery();
  const [draft, setDraft] = useState("");

  // Keep the field's local draft in sync when navigation changes the URL out
  // from under it (e.g. clearing filters elsewhere on the All Links page).
  // Adjusted during render rather than in an effect, keyed on the same values
  // the old effect depended on — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [priorOnLinksPage, setPriorOnLinksPage] = useState(onLinksPage);
  const [priorQuery, setPriorQuery] = useState(query);
  if (onLinksPage !== priorOnLinksPage || query !== priorQuery) {
    setPriorOnLinksPage(onLinksPage);
    setPriorQuery(query);
    setDraft(onLinksPage ? query : "");
  }

  const value = onLinksPage ? query : draft;

  const handleChange = (next: string) => {
    if (onLinksPage) {
      setQuery(next);
    } else {
      setDraft(next);
    }
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (!onLinksPage && draft.trim()) {
          router.push(`/links?q=${encodeURIComponent(draft)}`);
        }
      }}
      className="hidden w-full max-w-sm sm:block"
    >
      <SearchInput
        value={value}
        onChange={handleChange}
        label="Search all links"
        placeholder="Search links, tags, domains..."
      />
    </form>
  );
}
