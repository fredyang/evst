# Detecting unsubscribed events

Published events without a state handler or task listener have no observable
effect. `no-unsubscribed-events` reports those declarations.

## Failing example

`incrementRequested` is published but has no State handler or Task listener. Its
declaration is reported because no subscriber responds to it.

```ts
const fromCounterWidget = events("Counter Widget", {
  incrementRequested: emptyProps(),
});

function increment() {
  fromCounterWidget.incrementRequested.publish();
}
```

## Passing example

A State handler subscribes to the event and updates the count.

```ts
const fromCounterWidget = events("Counter Widget", {
  incrementRequested: emptyProps(),
});

function increment() {
  fromCounterWidget.incrementRequested.publish();
}

const counterState = evst("counter", { count: 0 }).state((on) => ({
  increment: on(fromCounterWidget.incrementRequested, (state) => ({
    ...state,
    count: state.count + 1,
  })),
}));
```

An event-driven Task also counts as a subscriber. A Task using
`on(fromCounterWidget, ...)` subscribes to every event in that group. Removing an
unnecessary event and its publications is another valid fix.

## Analysis scope

The rule requires type-aware linting with `parserOptions.project` or
`projectService`. Imported aliases are resolved throughout the TypeScript
program.
