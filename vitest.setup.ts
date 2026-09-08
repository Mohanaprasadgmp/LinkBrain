import { loadEnvConfig } from "@next/env";

/**
 * Vitest runs outside the Next.js request lifecycle, so env files need to be
 * loaded explicitly — same reasoning as drizzle.config.ts and the seed script.
 *
 * Vitest sets `NODE_ENV=test`, and Next's own env-loading convention
 * (`loadEnvConfig`) deliberately does NOT read `.env.local` under
 * `NODE_ENV=test` — it reads `.env.test.local` instead. That's not a bug to
 * work around; it's the same convention that motivates pointing tests at a
 * separate database from dev (see README's testing section): copy
 * `.env.local` to `.env.test.local` (ideally with a different, dedicated
 * `DATABASE_URL` — a Neon branch, for instance) rather than reusing dev's
 * env file directly.
 */
loadEnvConfig(process.cwd());
