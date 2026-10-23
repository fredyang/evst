import evst from "@evst/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/**/*.spec.ts", "src/**/*.spec.tsx"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    extends: [evst.configs.rtk],
  },
);
