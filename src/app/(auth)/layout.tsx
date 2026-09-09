import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";

/**
 * The chrome-free layout for `/sign-in` and `/sign-up` — no sidebar/topbar,
 * per `docs/ARCHITECTURE.md`'s "Route groups reserve room for auth" section,
 * which anticipated exactly this `(auth)` group as a zero-cost addition
 * alongside `(workspace)`.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden bg-canvas px-4 py-12">
      {/*
       * Decorative only (aria-hidden, pointer-events-none): a soft accent-coloured
       * glow plus a faint grid, built from the same tokens as the rest of the
       * app rather than a stock photo, so it stays on-brand and adapts to
       * light/dark mode for free.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, var(--accent), transparent 42%), radial-gradient(circle at 82% 78%, var(--accent), transparent 42%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black, transparent 75%)",
        }}
      />

      <div className="relative flex w-full flex-col items-center gap-8">
        <Logo />
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-overlay sm:p-8">
          {children}
        </div>
        <p className="text-center text-xs text-ink-subtle">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline hover:text-ink-muted">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-ink-muted">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
