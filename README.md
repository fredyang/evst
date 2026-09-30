# NgRx Eventify

Event-first state-management utilities and an ESLint plugin for Angular and NgRx applications.

| Package                                            | Purpose                                             |
| -------------------------------------------------- | --------------------------------------------------- |
| [@ngrx-eventify/store](packages/store/README.md)   | `events`, `state`, `tasks`, and `provideStoreSugar` |
| [@ngrx-eventify/eslint](packages/eslint/README.md) | Event-first ESLint rules                            |

Each package has its own manifest, source, tests, and build output. The root is a private npm workspace.

## Developing

Commands run from the workspace root:

```sh
npm install
npm run build
npm test
```

A single package can be tested with `npm test --workspace @ngrx-eventify/store` or `npm test --workspace @ngrx-eventify/eslint`.

## Packaging

```sh
npm run pack:all
```

This builds both packages and creates separate installable archives. A single package can be packed with `npm pack --workspace @ngrx-eventify/store` or `npm pack --workspace @ngrx-eventify/eslint`.

## Using the utilities locally

The sibling NgRx example workspace uses `file:../ngrx-sugar/packages/store`. The utilities must be built before installation and rebuilt after source changes.

## Licensing

The packages retain their MIT [license](LICENSE). Attribution for the adapted NgRx rule appears in the [ESLint plugin README](packages/eslint/README.md).
