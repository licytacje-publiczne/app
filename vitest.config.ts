import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scraper/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["scraper/src/**/*.ts", "shared/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
