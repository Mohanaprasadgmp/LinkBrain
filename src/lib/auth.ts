import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/**
 * The Better Auth server instance — the single source of truth for
 * sessions, users, and sign-in/sign-up. Everything else (the API route
 * handler, `proxy.ts`, `lib/auth/session.ts`) calls into this, never
 * re-implements any of it.
 *
 * Picked over Auth.js/NextAuth: the only App-Router-native NextAuth config is
 * still a beta release (`next-auth@5.0.0-beta.32`) and its Credentials
 * provider doesn't hash/verify passwords for you. Better Auth is a stable
 * 1.x release with built-in password hashing, built-in Google OAuth, and a
 * Drizzle Postgres adapter that matches this project's exact `drizzle-orm`
 * version — no hand-rolled cryptography anywhere in this app.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Only registered when both credentials are present — Better Auth logs a
  // (harmless) warning and disables the provider otherwise, but reading two
  // empty strings from `process.env` at module load is worth avoiding.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [nextCookies()],
});
