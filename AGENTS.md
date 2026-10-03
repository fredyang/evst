# Working with EVST

EVST is an event-first facade for NgRx Store. Its four concepts are Event,
View, State, and Task. Detailed guidance is in [the root README](README.md);
generate the full JSDoc API reference with `npm run docs:api`.

## Using the API

- Define events with `events(source, definitions)`. Group variables follow the
  `fromSource` convention, such as `fromBooksPage`; event keys are camelCase,
  such as `bookSelected`.
- Model feature state with `state(name, initialState)`. Initial-state fields
  automatically provide Views. Use `.withViews()` for derived Views and `.on()`
  for pure state transitions.
- Define side effects with `tasks((on) => ({ ... }))`. Task `on()` handlers
  receive event-filtered observable pipelines and return outcome events.
- Consumer code reads `state.views` through `.signal()` by default. Use
  `.observable()` for RxJS composition or Angular `AsyncPipe` templates.
- Consumer code publishes events through `.publish(...)`. Do not introduce raw
  `store.select(...)` or `store.dispatch(...)` when a View or event expresses
  the feature interaction.
- Register the root once with `provideEvst()`, then register State and Task
  definitions through `.provide()` or `bundle(...).provide()`.

## Preserving the event-first model

- An event has one publishing boundary.
- An executable boundary publishes one event. Do not publish several events in
  sequence to coordinate work.
- A State handles an event once. Independent Tasks may respond to the same
  event.
- Tasks return outcome events; they do not publish follow-up events themselves.
- Manual View subscriptions are exceptional. Prefer Signals or `AsyncPipe`; an
  imperative subscription needs automatic teardown and a documented lint
  suppression reason.

`@evst/eslint-plugin` encodes these conventions. Keep applicable rules enabled
and update their tests and documentation when changing rule behavior.

## Verifying changes

Run the narrowest relevant checks:

```sh
npm test --workspace @evst/store
npm test --workspace @evst/eslint-plugin
npm run lint:evst-books
npm run docs:api
```

State transitions can be tested through `state.reducer`. Test Task behavior by
invoking the named functional Effect in `taskCollection.effects` inside an
Angular test injector.
