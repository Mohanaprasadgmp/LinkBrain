import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the Next.js request lifecycle (as a standalone
// CLI), so it needs Next's own .env loading logic run explicitly to see
// .env.local — this is the officially documented way to do that in a
// standalone script.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
