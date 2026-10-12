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
  test: { include: ["examples/projects/evst-rtk-books/test/**/*.test.ts"] },
});
