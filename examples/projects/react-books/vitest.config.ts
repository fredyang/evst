import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@evst/react": path.resolve(
        import.meta.dirname,
        "../../../packages/react/src/index.ts",
      ),
    },
  },
  test: { include: ["examples/projects/react-books/test/**/*.test.ts"] },
});
