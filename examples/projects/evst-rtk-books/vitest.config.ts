import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@evst/rtk": path.resolve(
        import.meta.dirname,
        "../../../packages/rtk/src/index.ts",
      ),
    },
  },
  test: {
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.spec.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
