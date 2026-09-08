import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * The Drizzle client, as a lazily-created singleton.
 *
 * `import "server-only"` makes it a build error for any client component to
 * import this module (directly or transitively) — `DATABASE_URL` must never
 * reach the browser bundle.
 *
 * Creation is deliberately lazy (inside `getDb()`, not at module top level):
 * pages that fetch data opt into dynamic rendering via `connection()` (from
 * `next/server`), which excludes them from `next build`'s static-generation
 * pass — so as long as nothing touches the database at import time,
 * `next build` succeeds even before `DATABASE_URL` exists. A top-level
 * `postgres(process.env.DATABASE_URL)` call would throw the moment this
 * module was imported, during that same build step.
 *
 * The `globalThis` cache guards against `next dev`'s fast refresh re-running
 * this module on every edit, which would otherwise open a new connection
 * pool each time and eventually exhaust Postgres's connection limit — the
 * same pattern used for every ORM client in Next.js dev.
 */

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { linkbrainDb?: Database };

export function getDb(): Database {
  if (globalForDb.linkbrainDb) return globalForDb.linkbrainDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string.",
    );
  }

  // A modest pool size: this process holds it for its lifetime rather than
  // per-request, so it doesn't need to be large even under concurrent load.
  const client = postgres(connectionString, { max: 10 });
  const db = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.linkbrainDb = db;
  }

  return db;
}
