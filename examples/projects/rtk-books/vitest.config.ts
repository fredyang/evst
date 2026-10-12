import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["examples/projects/rtk-books/test/**/*.test.ts"] },
});
