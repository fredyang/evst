<h1 align="center">EVST - Event, View, State, Task</h1>

<p align="center">
  <strong>The minimalist, event-driven facade for NgRx Store.</strong>
</p>

EVST makes NgRx's event-driven core explicit. Provider code models how state
responds to events and exposes Views; consumer code reads Views and publishes
events. The Store plumbing stays behind those feature-level concepts.

![EVST coding model](images/ngrx-evntify-coding-model.png)

## Understanding the model

| Object    | Role                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| **Event** | Describes something that happened and is published by its source.                     |
| **View**  | Exposes read-only state to consumer code.                                             |
| **State** | Handles events through pure state transitions and provides Views.                     |
| **Task**  | Handles events, performs asynchronous or imperative work, and returns outcome events. |

Consumer code stays focused on what is displayed and what happened, rather than
coordinating through `store.select(...)` and `store.dispatch(...)`.

## Keeping code event-first

Publishing events alone does not make code event-driven. An event has one
publishing boundary, and an executable boundary publishes one event.
**Publishing the same event in several places, or publishing several events in
sequence, turns events into commands that coordinate work.**

The accompanying ESLint plugin reports these and other event-first violations.

## Exploring the packages

| Package                                                 | Purpose                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [@evst/store](packages/store/README.md)                 | The Event, View, State, and Task API, with a provider and consumer walkthrough. |
| [@evst/eslint-plugin](packages/eslint-plugin/README.md) | ESLint rules that preserve event-first conventions.                             |

The Store API reference is generated locally from TypeScript signatures and
JSDoc with `npm run docs:api`.

## Developing EVST

The root is a private npm workspace. Commands run from the repository root:

```sh
npm install
npm run build
npm test
```

Package-level checks are also available:

```sh
npm test --workspace @evst/store
npm test --workspace @evst/eslint-plugin
npm run docs:api
```

## Packaging

```sh
npm run pack:all
```

This creates installable archives for both packages. The packages retain their
MIT [license](LICENSE). Attribution for the adapted NgRx rule appears in the
[@evst/eslint-plugin README](packages/eslint-plugin/README.md).
