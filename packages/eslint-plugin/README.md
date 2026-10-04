# EVST ESLint plugin

ESLint rules for event-oriented NgRx applications.

The source, complete documentation, API reference, and Books examples for this
package are in the main [EVST repository](https://github.com/fredyang/evst).
Please file issues and pull requests there.

License: MIT

## Installing

From the workspace root:

```sh
npm install
npm test --workspace @evst/eslint-plugin
npm pack --workspace @evst/eslint-plugin
```

The generated `evst-eslint-0.1.0.tgz` can be installed in a consuming project with `npm install --save-dev /path/to/evst-eslint-0.1.0.tgz`.

## Configuring ESLint

Flat configuration for an EVST application (`eslint.config.mjs`):

```js
import tseslint from "typescript-eslint";
import evst from "@evst/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { evst },
    ...evst.configs.evst,
  },
];
```

The `ngrx` preset supports standard NgRx actions and Store dispatches. It
includes action-type hygiene, repeated action dispatch detection, and multiple
dispatch detection within one executable boundary. EVST-specific rules,
including source-oriented event-group naming, remain in the `evst` preset.

```js
import tseslint from "typescript-eslint";
import evst from "@evst/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { evst },
    ...evst.configs.ngrx,
  },
];
```

The consuming project needs ESLint 9 and `typescript-eslint`. Rule behavior and limitations are described in the [event-group source-prefix guide](docs/rules/event-group-source-prefix.md), [event publisher ownership guide](docs/rules/event-publisher-ownership.md), [duplicate event handlers guide](docs/rules/no-duplicate-event-handlers.md), [sequential event publication guide](docs/rules/no-sequential-event-publishes.md), [unpublished event guide](docs/rules/no-unpublished-events.md), [unsubscribed event guide](docs/rules/no-unsubscribed-events.md), [manual View subscription guide](docs/rules/no-view-subscription.md), [event-driven task guide](docs/rules/require-task-event.md), and [unused state views guide](docs/rules/no-unused-views.md). The unused-views rule requires type-aware linting with a `parserOptions.project` setting.

## Developing

`npm run build` compiles TypeScript and emits declarations. `npm test` builds the plugin and runs the migrated rule cases with ESLint's RuleTester.
