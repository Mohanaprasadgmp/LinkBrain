import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage() {
  // `proxy.ts` already redirects an authenticated visitor away from this
  // page optimistically; this is the authoritative, defense-in-depth check.
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
