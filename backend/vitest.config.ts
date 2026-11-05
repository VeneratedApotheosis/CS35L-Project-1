import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // config/env.ts throws without the Supabase variables. dotenv does not
    // override variables that are already set, so a local .env is never used.
    env: {
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_PUBLISHABLE_KEY: "test-key",
      LOG_LEVEL: "silent",
      FRONTEND_ORIGIN: "http://localhost:5173",
    },
  },
});
