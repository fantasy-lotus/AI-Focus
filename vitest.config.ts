import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000, // 增加超时时间以适应AI API调用
    include: ["**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/analyzer.test.ts",
      "tests/config.test.ts",
      "tests/structure.test.ts",
      "tests/integration/orchestrator.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
