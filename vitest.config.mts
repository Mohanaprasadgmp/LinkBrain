import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    // Repository code imports "server-only", a marker package whose
    // package.json resolves to a no-op under the "react-server" export
    // condition and to a throwing stub otherwise — Next's bundler sets that
    // condition automatically; outside it (here, and in the seed script via
    // `tsx --conditions react-server`), it has to be requested explicitly.
    // Set on both: Vitest's Node-environment tests resolve through Vite's
    // SSR path, but `resolve.conditions` is included too in case that ever
    // changes — harmless to set both to the same value.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Repository tests share real tables (tags, projects) via a real
    // Postgres connection — running test files sequentially avoids one
    // file's cleanup racing another's inserts.
    fileParallelism: false,
  },
});
