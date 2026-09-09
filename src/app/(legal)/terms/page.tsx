import type { Metadata } from "next";

import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-ink-muted">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Terms of Service</h1>
        <p className="mt-2 text-xs text-ink-subtle">Last updated: 2026-09-09</p>
      </div>

      <p>
        These terms are written in plain language for a small, single-developer
        project. They are not a substitute for professional legal advice.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Using {SITE.name}</h2>
        <p>
          {SITE.name} is a personal link-saving tool. You&rsquo;re responsible for the
          content of the links, notes and projects you save, and for keeping your
          account credentials secure. Don&rsquo;t use it to store or share unlawful
          content.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">The Chrome extension</h2>
        <p>
          The extension only acts when you open its popup and choose to save a page —
          it does not run in the background, monitor your browsing, or read any tab
          you haven&rsquo;t explicitly opened it on.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">No warranty</h2>
        <p>
          {SITE.name} is provided &ldquo;as is,&rdquo; without warranty of any kind. As
          a small, independently-run project, uptime, data durability and feature
          availability are not guaranteed. Back up anything you can&rsquo;t afford to
          lose.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Changes to the service</h2>
        <p>
          Features may change, and in rare cases the service may be discontinued. If
          that ever happens, reasonable notice will be given where practical.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Changes to these terms</h2>
        <p>
          If these terms change in a way that matters, the &ldquo;Last updated&rdquo;
          date above will change along with it.
        </p>
      </section>
    </article>
  );
}
