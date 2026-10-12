import { defineConfig } from "vite";
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
  build: { outDir: "dist", emptyOutDir: true },
});
