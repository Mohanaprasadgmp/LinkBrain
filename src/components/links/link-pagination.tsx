"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface LinkPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

/** Previous/Next pagination — see `lib/links/query-state.ts` for why page/offset over cursor. */
export function LinkPagination({ page, pageSize, totalCount, onPageChange }: LinkPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-xs text-ink-subtle">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
