import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["src/lib/client/**", "src/lib/push.ts", "src/lib/ratelimit.ts", "src/lib/logger.ts"],
      reporter: ["text", "html"],
    },
  },
});
