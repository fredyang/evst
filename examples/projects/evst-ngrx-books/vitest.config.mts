import { defineProject, mergeConfig } from "vitest/config";
import { baseConfig } from "../../vitest.config.mjs";

export default defineProject((config) =>
  mergeConfig(baseConfig, {
    root: __dirname,
    test: {
      name: "evst-ngrx-books",
    },
    define: {
      "import.meta.vitest": config.mode !== "production",
    },
  }),
);
