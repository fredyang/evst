# NgRx Sugar ESLint plugin

ESLint rules for event-oriented NgRx applications.

## Installing

From the workspace root:

```sh
npm install
npm test --workspace @ngrx-sugar/eslint
npm pack --workspace @ngrx-sugar/eslint
```

The generated `ngrx-sugar-eslint-0.1.0.tgz` can be installed in a consuming project with `npm install --save-dev /path/to/ngrx-sugar-eslint-0.1.0.tgz`.

## Configuring ESLint

Flat configuration (`eslint.config.mjs`):

```js
import tseslint from "typescript-eslint";
import ngrxSugar from "@ngrx-sugar/eslint";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "ngrx-sugar": ngrxSugar },
    rules: { "ngrx-sugar/good-action-hygiene": "error" },
  },
];
```

The consuming project needs ESLint 9 and `typescript-eslint`. Rule behavior and limitations are described in the [rule guide](docs/rules/good-action-hygiene.md).

## Developing

`npm run build` compiles TypeScript and emits declarations. `npm test` builds the plugin and runs the migrated rule cases with ESLint's RuleTester.

## Attribution

The rule and test cases were adapted from NgRx's MIT-licensed `good-action-hygiene` rule, including the custom event-naming changes in commit `191ee2f5`. The original copyright notice is retained in [LICENSE](LICENSE).
