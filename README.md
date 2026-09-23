# NgRx Sugar

Utilities and an ESLint plugin for event-oriented NgRx applications.

| Package                                         | Purpose                                            |
| ----------------------------------------------- | -------------------------------------------------- |
| [@ngrx-sugar/store](packages/store/README.md)   | `events`, `state`, `task`, and `provideStoreSugar` |
| [@ngrx-sugar/eslint](packages/eslint/README.md) | The `good-action-hygiene` ESLint rule              |

Each package has its own manifest, source, tests, and build output. The root is a private npm workspace.

## Developing

Commands run from the workspace root:

```sh
npm install
npm run build
npm test
```

A single package can be tested with `npm test --workspace @ngrx-sugar/store` or `npm test --workspace @ngrx-sugar/eslint`.

## Packaging

```sh
npm run pack:all
```

This builds both packages and creates separate installable archives. A single package can be packed with `npm pack --workspace @ngrx-sugar/store` or `npm pack --workspace @ngrx-sugar/eslint`.

## Using the utilities locally

The sibling NgRx example workspace uses `file:../ngrx-sugar/packages/store`. The utilities must be built before installation and rebuilt after source changes.

## Licensing

The packages retain their MIT [license](LICENSE). Attribution for the adapted NgRx rule appears in the [ESLint plugin README](packages/eslint/README.md).
