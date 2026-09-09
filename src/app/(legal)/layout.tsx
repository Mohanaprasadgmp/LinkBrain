import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";

/**
 * The chrome-free layout for `/privacy` and `/terms` — reachable whether or
 * not the visitor is signed in (see `proxy.ts`'s `PUBLIC_PATHS`), so this
 * deliberately doesn't assume a session the way `(workspace)/layout.tsx`
 * does. No sidebar/topbar, same zero-cost-route-group pattern as `(auth)`.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border px-6 py-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        {children}
        <p className="mt-12 border-t border-border pt-6 text-sm">
          <Link href="/" className="text-accent hover:underline">
            ← Back to LinkBrain
          </Link>
        </p>
      </main>
    </div>
  );
}
