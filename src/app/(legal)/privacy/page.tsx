import type { Metadata } from "next";

import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * Deliberately plain and specific to what this app actually does — no
 * boilerplate claims about things LinkBrain doesn't have (there's no
 * self-service account deletion or analytics yet; this says so rather than
 * promising a flow that doesn't exist). Not a substitute for legal advice —
 * said explicitly, not just implied.
 */
export default function PrivacyPage() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-ink-muted">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Privacy Policy</h1>
        <p className="mt-2 text-xs text-ink-subtle">Last updated: 2026-09-09</p>
      </div>

      <p>
        This page explains what {SITE.name} collects and why. It&rsquo;s written in
        plain language for a small, single-developer project — it is not a substitute
        for professional legal advice, and you should seek that advice if you need it
        for your own use of this service.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name and email address, from sign-up or from Google sign-in.</li>
          <li>
            The URLs you save, along with a title, description, preview image and
            favicon fetched automatically from the page you saved (see &ldquo;Metadata
            extraction&rdquo; below), any personal note you write, and how you
            organise links into projects and statuses.
          </li>
          <li>
            If you use the Chrome extension: the URL and title of the tab you&rsquo;re
            on, read only at the moment you open the extension&rsquo;s popup — never in
            the background, and never for tabs you haven&rsquo;t opened the extension
            on.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Metadata extraction</h2>
        <p>
          When you save a link, our server fetches the page you linked to, in order to
          read its title, description and preview image — the same way a messaging app
          shows a link preview. This is a one-time, server-side fetch; it doesn&rsquo;t
          run in your browser and doesn&rsquo;t share your identity with the site you
          linked to beyond what a normal page visit would.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Where your data lives</h2>
        <p>
          Your account and saved links are stored in a PostgreSQL database hosted by
          Neon. The application itself runs on Vercel. If you sign in with Google,
          Google processes your sign-in per its own privacy policy — we only receive
          your name, email, and profile image from that flow.
        </p>
        <p>
          The Chrome extension stores an authentication token and your name/email
          locally in your browser (Chrome&rsquo;s extension storage), so it can save
          links on your behalf. It never stores a password, and it never has access to
          your database credentials or any other user&rsquo;s data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">What we don&rsquo;t do</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>We don&rsquo;t sell your data or share it with advertisers.</li>
          <li>We don&rsquo;t run analytics or tracking scripts on this application.</li>
          <li>We don&rsquo;t use your saved links to train any AI model.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Access and deletion</h2>
        <p>
          Every user&rsquo;s links and projects are isolated at the database level —
          no other user can read or modify them. There is no self-service
          &ldquo;delete my account&rdquo; button yet; if you&rsquo;d like your data
          removed, contact the email address associated with this project&rsquo;s
          repository and it will be deleted manually.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Changes</h2>
        <p>
          If this policy changes in a way that matters, the &ldquo;Last updated&rdquo;
          date above will change along with it.
        </p>
      </section>
    </article>
  );
}
