import evst from "@evst/eslint-plugin";
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
    extends: [evst.configs["evst-ngrx"]],
  },
);
