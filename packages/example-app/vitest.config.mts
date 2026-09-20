import angular from "@analogjs/vite-plugin-angular";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [angular(), tsconfigPaths({ projects: ["./tsconfig.base.json"] })],
  test: {
    name: "example-app",
    globals: true,
    environment: "jsdom",
    pool: "forks",
    include: ["**/*.{spec,test}.ts"],
    passWithNoTests: true,
    setupFiles: ["test-setup.ts"],
    typecheck: {
      enabled: true,
      ignoreSourceErrors: true,
      include: ["**/*.{spec,test}.ts", "**/*.test-d.ts"],
      tsconfig: "./tsconfig.spec.json",
    },
  },
  define: {
    "import.meta.vitest": mode !== "production",
  },
}));
