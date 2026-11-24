import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // The plant tests grow many generated plants, which is slow when every test file runs in parallel (#292).
    // This is the one timeout for them: do not set per-file or per-test timeouts.
    testTimeout: 30_000,
  },
})
