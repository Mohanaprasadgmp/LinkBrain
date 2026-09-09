"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** A minimal "G" mark — no external icon font/asset, just enough to read as Google's logo at this size. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.42-.22-2.05H12v3.72h6.62c-.13 1.1-.86 2.76-2.47 3.87l-.02.15 3.59 2.78.25.02c2.28-2.1 3.55-5.2 3.55-8.49Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.78-2.94c-1.02.7-2.38 1.19-4.16 1.19-3.18 0-5.88-2.1-6.84-5.02l-.14.01-3.72 2.88-.05.13C3.24 21.3 7.28 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.16 14.33A7.4 7.4 0 0 1 4.77 12c0-.81.14-1.6.38-2.33l-.01-.16-3.77-2.93-.12.06A11.97 11.97 0 0 0 0 12c0 1.94.47 3.77 1.25 5.36l3.91-3.03Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c2.25 0 3.77.97 4.64 1.79l3.39-3.31C17.94 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.25 6.64l3.9 3.03C6.12 6.86 8.82 4.77 12 4.77Z"
      />
    </svg>
  );
}

/**
 * Shared "Continue with Google" button for both sign-in and sign-up — the
 * OAuth flow doesn't distinguish first-time vs. returning: Better Auth
 * creates the account on first sign-in and reuses it on every return.
 */
export function GoogleButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);

    startTransition(async () => {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: callbackUrl });
      if (result?.error) {
        setError("Google sign-in isn't available right now. Try email and password instead.");
      }
      // On success Better Auth redirects the browser to Google itself —
      // there is no further local state to update.
    });
  };

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleClick}
        disabled={isPending}
      >
        <GoogleMark />
        {isPending ? "Redirecting..." : "Continue with Google"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
