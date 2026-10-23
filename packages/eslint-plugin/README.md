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

ESLint 9 and 10 are supported. ESLint 10 requires Node.js 20.19+, 22.13+, or
24+ and a compatible `typescript-eslint` version.

## Configuring ESLint

The preset follows the state-management package used by the application:

| Application package | Preset                      |
| ------------------- | --------------------------- |
| `@evst/rtk`         | `evst.configs.rtk`          |
| `@evst/ngrx-store`  | `evst.configs["evst-ngrx"]` |

All presets use the same `evst/` rule namespace. Each EVST preset includes the
shared rules and registers the plugin automatically, so only one preset in
`extends` is needed. Separate `plugins` registration and spreading `.rules`
are unnecessary. The `core`, `evst`, and plain-NgRx `ngrx`
presets have been removed. Existing `evst.configs.evst` configurations migrate
to `evst.configs["evst-ngrx"]`; `evst.configs.core` configurations migrate to
`rtk` or `evst-ngrx` according to the application package. Plain NgRx
applications use `@ngrx/eslint-plugin` instead of an EVST preset.

Flat configuration for React and `@evst/rtk` (`eslint.config.mjs`):

```js
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import evst from "@evst/eslint-plugin";

export default defineConfig([
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
]);
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

### Configuring an Angular CommonJS application

The examples above use ES modules (`eslint.config.mjs`). An Angular
`eslint.config.js` in a CommonJS package uses `require()` and
`module.exports` instead. The preset belongs in the existing TypeScript
configuration's `extends` array, alongside the Angular and TypeScript presets.
The existing processor and rule overrides remain in the same object.

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
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      evst.configs["evst-ngrx"],
    ],
    processor: angular.processInlineTemplates,
    rules: {
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

This example uses the `evst-ngrx` preset for `@evst/ngrx-store`. Presets include
ESLint-compatible types, including for configs using `// @ts-check`.

The consuming project needs ESLint 9 or 10 and `typescript-eslint`. Rule behavior and limitations are described in the [event-group source-prefix guide](docs/rules/event-group-source-prefix.md), [event publisher ownership guide](docs/rules/event-publisher-ownership.md), [duplicate event handlers guide](docs/rules/no-duplicate-event-handlers.md), [sequential event publication guide](docs/rules/no-sequential-event-publishes.md), [unpublished event guide](docs/rules/no-unpublished-events.md), [unsubscribed event guide](docs/rules/no-unsubscribed-events.md), [manual View subscription guide](docs/rules/no-view-subscription.md), [event-driven task guide](docs/rules/require-task-event.md), and [unused state views guide](docs/rules/no-unused-views.md). The unused-views rule requires type-aware linting with a `parserOptions.project` setting.

## Developing

`npm run build` compiles TypeScript and emits declarations. `npm test` builds the plugin and runs the migrated rule cases with ESLint's RuleTester.

The `evst-ngrx` preset includes
[`require-task-dispatch-false`](docs/rules/require-task-dispatch-false.md), which
uses TypeScript output types to report Tasks emitting non-event values without
`{ dispatch: false }`. This check requires a TypeScript project.
