import sugar from "@ngrx-sugar/eslint";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/**/*.spec.ts"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "ngrx-sugar": sugar },
    rules: {
      "ngrx-sugar/event-hygiene": "error",
      "ngrx-sugar/event-publisher-ownership": "warn",
    },
  },
);
