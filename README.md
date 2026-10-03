# EVST

Event-first state management, built on NgRx.

| Package                                                 | Purpose                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| [@evst/store](packages/store/README.md)                 | `events`, `state`, `tasks`, and `provideEvst` |
| [@evst/eslint-plugin](packages/eslint-plugin/README.md) | Event-first ESLint rules                      |

Each package has its own manifest, source, tests, and build output. The root is a private npm workspace.

## Developing

Commands run from the workspace root:

```sh
npm install
npm run build
npm test
```

A single package can be tested with `npm test --workspace @evst/store` or `npm test --workspace @evst/eslint-plugin`.

## Packaging

```sh
npm run pack:all
```

This builds both packages and creates separate installable archives. A single package can be packed with `npm pack --workspace @evst/store` or `npm pack --workspace @evst/eslint-plugin`.

## Using the utilities locally

The sibling NgRx example workspace uses `file:../ngrx-sugar/packages/store`. The utilities must be built before installation and rebuilt after source changes.

## Licensing

The packages retain their MIT [license](LICENSE). Attribution for the adapted NgRx rule appears in the [ESLint plugin README](packages/eslint-plugin/README.md).
