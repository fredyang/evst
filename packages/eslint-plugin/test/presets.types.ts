import { defineConfig } from "eslint/config";
import evst = require("../dist/index");

// Published preset types work directly with ESLint, without casts or registration.
defineConfig([
  {
    files: ["**/*.ts"],
    extends: [evst.configs["evst-ngrx"]],
    rules: { "evst/no-view-subscription": "error" },
  },
  {
    files: ["**/*.tsx"],
    extends: [evst.configs.rtk],
  },
]);
