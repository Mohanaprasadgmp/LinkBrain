import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
