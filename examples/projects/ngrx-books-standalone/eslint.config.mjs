import ngrx from "@ngrx/eslint-plugin";
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
    plugins: { "@ngrx": ngrx },
    rules: {
      "@ngrx/avoid-dispatching-multiple-actions-sequentially": "warn",
      "@ngrx/avoid-duplicate-actions-in-reducer": "warn",
    },
  },
);
