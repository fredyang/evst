# EVST ESLint plugin

ESLint rules for EVST applications using NgRx or Redux Toolkit.

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

In a consuming application:

```sh
npm install --save-dev @evst/eslint-plugin eslint typescript-eslint
```

## Configuring ESLint

All presets use the same `evst/` rule namespace. The framework presets include
the shared rules; combining them with `core` is unnecessary.

| Preset      | Purpose                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `core`      | Shared event naming, publisher ownership, sequential publication, duplicate state handlers, unused events, and unused derived Views |
| `rtk`       | Complete preset for `@evst/rtk`; currently the same rules as `core`                                                                 |
| `evst-ngrx` | Shared rules plus Angular View-subscription and NgRx Task-source rules                                                              |
| `evst`      | Existing NgRx-oriented EVST preset, preserved for compatibility                                                                     |
| `ngrx`      | Existing plain-NgRx preset, preserved for compatibility                                                                             |

Flat configuration for React and `@evst/rtk` (`eslint.config.mjs`):

```js
import tseslint from "typescript-eslint";
import evst from "@evst/eslint-plugin";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { evst },
    ...evst.configs.rtk,
  },
];
```

The lint TypeScript project should include application sources and exclude
tests so test publications do not count as application publishers:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/**/*.spec.ts", "src/**/*.spec.tsx"]
}
```

For `@evst/ngrx-store`, the same configuration can use `evst.configs["evst-ngrx"]`.
The RTK preset excludes Angular Observable-subscription guidance and NgRx
eventless Task rules. RTK Tasks already require an event argument.

Type-aware analysis recognizes View references in TSX, including `.use()`,
and event creators called inside Tasks, including async returned outcomes.
Unused-event and unused-View checks need a TypeScript project. Publisher
ownership checks span the project when configured and otherwise inspect only
the current file.

These checks retain the existing static-analysis limits: several helpers
recognize conventional names such as `events`, `state`, `task`, and `on`.
Publisher ownership and sequential-publication checks inspect explicit
`.publish()` and `.dispatch()` calls; they do not enforce ownership of
returned Task outcomes. The unused-event check treats event creator calls
inside Tasks as publications without proving that they are returned.

The `ngrx` preset supports explicit Store dispatch checks and duplicate EVST
state-handler checks. EVST-specific source naming and usage analysis remain
in the EVST presets.

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

### Configuring an Angular CommonJS application

The examples above use ES modules (`eslint.config.mjs`). An Angular
`eslint.config.js` in a CommonJS package uses `require()` and
`module.exports` instead. The EVST plugin registration and preset rules belong
inside the existing TypeScript configuration object, alongside `extends` and
`processor`. Spreading preset rules into `rules` preserves Angular rules.

```js
// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const evst = require("@evst/eslint-plugin");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      evst: /** @type {import("eslint").ESLint.Plugin} */ (
        /** @type {unknown} */ (evst)
      ),
    },
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      .../** @type {import("eslint").Linter.RulesRecord} */ (
        evst.configs.ngrx.rules
      ),
      // Existing Angular rule overrides belong here.
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
  },
]);
```

This example uses the plain-NgRx preset. Applications using `@evst/ngrx-store`
can replace `evst.configs.ngrx.rules` with
`evst.configs["evst-ngrx"].rules`. The JSDoc casts adapt the plugin's preset
severity declarations and linked ESLint types for configs using `// @ts-check`.

The consuming project needs ESLint 9 and `typescript-eslint`. Rule behavior and limitations are described in the [event-group source-prefix guide](docs/rules/event-group-source-prefix.md), [event publisher ownership guide](docs/rules/event-publisher-ownership.md), [duplicate event handlers guide](docs/rules/no-duplicate-event-handlers.md), [sequential event publication guide](docs/rules/no-sequential-event-publishes.md), [unpublished event guide](docs/rules/no-unpublished-events.md), [unsubscribed event guide](docs/rules/no-unsubscribed-events.md), [manual View subscription guide](docs/rules/no-view-subscription.md), [event-driven task guide](docs/rules/require-task-event.md), and [unused state views guide](docs/rules/no-unused-views.md). The unused-views rule requires type-aware linting with a `parserOptions.project` setting.

## Developing

`npm run build` compiles TypeScript and emits declarations. `npm test` builds the plugin and runs the migrated rule cases with ESLint's RuleTester.

The NgRx EVST presets include
[`require-task-dispatch-false`](docs/rules/require-task-dispatch-false.md), which
uses TypeScript output types to report Tasks emitting non-event values without
`{ dispatch: false }`. This check requires a TypeScript project.
