import sugar from "@ngrx-sugar/eslint";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/**/*.spec.ts"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "ngrx-sugar": sugar },
    rules: {
      "ngrx-sugar/event-hygiene": "error",
      "ngrx-sugar/event-publisher-ownership": "warn",
      "ngrx-sugar/no-sequential-event-publishes": "warn",
      "ngrx-sugar/no-unused-views": "warn",
      "ngrx-sugar/require-task-event": "warn",
      "ngrx-sugar/require-task-event-suppression-reason": "error",
    },
  },
);
