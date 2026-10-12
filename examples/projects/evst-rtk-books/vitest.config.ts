import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@evst/rtk": path.resolve(
        import.meta.dirname,
        "../../../packages/rtk/src/index.ts",
      ),
    },
  },
  test: {
    include: ["examples/projects/evst-rtk-books/src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["examples/projects/evst-rtk-books/src/**/*.{ts,tsx}"],
      exclude: ["**/*.spec.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "examples/projects/evst-rtk-books/coverage",
    },
  },
});
