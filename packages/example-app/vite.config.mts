import angular from "@analogjs/vite-plugin-angular";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  plugins: [
    angular({ tsconfig: "../tsconfig.app.json" }),
    tsconfigPaths({ projects: ["../tsconfig.base.json"] }),
  ],
  server: {
    port: 4200,
  },
  preview: {
    port: 4200,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
