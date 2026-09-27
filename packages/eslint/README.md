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
    rules: {
      "ngrx-sugar/event-hygiene": "error",
      "ngrx-sugar/event-publisher-ownership": "warn",
      "ngrx-sugar/no-sequential-event-publishes": "warn",
      "ngrx-sugar/no-unused-views": "warn",
    },
  },
];
```

The consuming project needs ESLint 9 and `typescript-eslint`. Rule behavior and limitations are described in the [event hygiene guide](docs/rules/event-hygiene.md), [event publisher ownership guide](docs/rules/event-publisher-ownership.md), [sequential event publication guide](docs/rules/no-sequential-event-publishes.md), and [unused state views guide](docs/rules/no-unused-views.md). The unused-views rule requires type-aware linting with a `parserOptions.project` setting.

## Developing

`npm run build` compiles TypeScript and emits declarations. `npm test` builds the plugin and runs the migrated rule cases with ESLint's RuleTester.

## Attribution

The rule and test cases were adapted from NgRx's MIT-licensed `good-action-hygiene` rule, including the custom event-naming changes in commit `191ee2f5`. The original copyright notice is retained in [LICENSE](LICENSE).
