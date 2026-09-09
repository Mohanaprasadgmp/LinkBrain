"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** Never the library's raw error string — mapped to one of a small, safe set. */
function messageFor(code: string | undefined): string {
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "Incorrect email or password.";
  return "Couldn't sign in. Try again.";
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(messageFor(result.error.code));
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">Welcome back to LinkBrain.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>

        <Field label="Password">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs text-ink-subtle">or</span>
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <GoogleButton callbackUrl={redirectTo} />

      <p className="text-center text-sm text-ink-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
