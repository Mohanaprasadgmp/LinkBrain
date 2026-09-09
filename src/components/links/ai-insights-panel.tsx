"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { regenerateAiInsights } from "@/lib/actions/ai";
import type { AiInsight } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

/**
 * The four states from the Phase 7 brief's mockup: not analyzed, processing,
 * completed, failed. `insight` is `null` for "not analyzed" — either AI
 * wasn't configured when this link was saved, or the link predates Phase 7;
 * either way, "Generate AI insights" (which reuses the same
 * `regenerateAiInsights` action — see its own handling of a missing row)
 * is the way forward.
 *
 * While `pending`/`processing`, this polls via `router.refresh()` a bounded
 * number of times (never indefinitely) so a page left open shows the result
 * without a manual reload — but a manual reload always works too, since the
 * AI attempt itself runs entirely server-side regardless of whether anyone
 * is watching.
 */
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function AiInsightsPanel({ linkId, insight }: { linkId: string; insight: AiInsight | null }) {
  const router = useRouter();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCountRef = useRef(0);

  const status = insight?.status ?? null;
  const isActive = status === "pending" || status === "processing";

  useEffect(() => {
    if (!isActive) {
      pollCountRef.current = 0;
      return;
    }
    if (pollCountRef.current >= MAX_POLLS) return;

    const timer = setTimeout(() => {
      pollCountRef.current += 1;
      router.refresh();
    }, POLL_INTERVAL_MS);

    // Re-runs each time `insight` changes (a fresh prop after `router.refresh()`
    // completes), which is what lets this "tick" forward until the status
    // leaves pending/processing or MAX_POLLS is reached.
    return () => clearTimeout(timer);
  }, [isActive, insight, router]);

  const handleRegenerate = () => {
    setError(null);
    setIsRegenerating(true);
    void regenerateAiInsights(linkId).then((result) => {
      setIsRegenerating(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Panel className="p-5">
      <h2 className="label-eyebrow mb-3">AI Insights</h2>

      {!insight ? (
        <EmptyState
          message="AI analysis hasn't been generated yet."
          buttonLabel="Generate AI insights"
          onClick={handleRegenerate}
          isBusy={isRegenerating}
        />
      ) : null}

      {isActive ? (
        <p className="text-sm text-ink-muted">Analyzing…</p>
      ) : null}

      {status === "failed" ? (
        <EmptyState
          message="AI processing failed."
          buttonLabel="Try again"
          onClick={handleRegenerate}
          isBusy={isRegenerating}
        />
      ) : null}

      {status === "completed" && insight ? (
        <div className="space-y-4">
          <section>
            <h3 className="mb-1 text-xs font-semibold text-ink-subtle uppercase">Summary</h3>
            <p className="text-sm text-ink">{insight.summary}</p>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold text-ink-subtle uppercase">Category</h3>
            <Badge>{insight.category}</Badge>
          </section>

          {insight.topics.length > 0 ? (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold text-ink-subtle uppercase">Topics</h3>
              <div className="flex flex-wrap gap-1.5">
                {insight.topics.map((topic) => (
                  <Badge key={topic}>{topic}</Badge>
                ))}
              </div>
            </section>
          ) : null}

          {insight.keyPoints.length > 0 ? (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold text-ink-subtle uppercase">Key Points</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-ink">
                {insight.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {insight.contentType ? (
            <section>
              <h3 className="mb-1 text-xs font-semibold text-ink-subtle uppercase">Content Type</h3>
              <Badge>{insight.contentType}</Badge>
            </section>
          ) : null}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? "Regenerating…" : "Regenerate AI"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </Panel>
  );
}

function EmptyState({
  message,
  buttonLabel,
  onClick,
  isBusy,
}: {
  message: string;
  buttonLabel: string;
  onClick: () => void;
  isBusy: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-muted">{message}</p>
      <Button variant="secondary" size="sm" onClick={onClick} disabled={isBusy}>
        {isBusy ? "Working…" : buttonLabel}
      </Button>
    </div>
  );
}
