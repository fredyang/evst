import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@evst/react": path.resolve(
        import.meta.dirname,
        "../../../packages/react/src/index.ts",
      ),
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
