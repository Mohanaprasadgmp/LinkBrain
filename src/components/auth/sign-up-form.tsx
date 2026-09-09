"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

/** Never the library's raw error string — mapped to one of a small, safe set. */
function messageFor(code: string | undefined): string {
  if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "An account with that email already exists. Try signing in instead.";
  }
  return "Couldn't create your account. Try again.";
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.signUp.email({ name: name.trim() || email, email, password });
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
        <h1 className="text-xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">Start saving links with LinkBrain.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

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

        <Field label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        <Field label="Confirm password">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
            />
          )}
        </Field>

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs text-ink-subtle">or</span>
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <GoogleButton callbackUrl={redirectTo} />

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
