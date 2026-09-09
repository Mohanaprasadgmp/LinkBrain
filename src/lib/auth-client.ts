"use client";

import { createAuthClient } from "better-auth/react";

/**
 * The client-side Better Auth SDK — used directly from the sign-in/sign-up
 * forms and `UserMenu`'s sign-out, per Better Auth's own recommended
 * architecture. It talks to `app/api/auth/[...all]/route.ts` under the hood
 * and manages the session cookie itself; nothing here re-implements any of
 * that.
 */
export const authClient = createAuthClient();
