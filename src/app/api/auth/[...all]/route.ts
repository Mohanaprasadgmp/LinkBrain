import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * The one route every Better Auth client call (sign-in, sign-up, sign-out,
 * session lookup, the Google OAuth redirect/callback) goes through. Nothing
 * app-specific lives here — `lib/auth.ts` owns all the actual configuration.
 */
export const { GET, POST } = toNextJsHandler(auth);
