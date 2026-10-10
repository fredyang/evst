# @evst/react

`@evst/react` is an event-first state-management facade for React and Redux Toolkit. It organizes feature code around events, views, state, and tasks.

## Defining a feature

```ts
import { emptyProps, events, props, state, view } from "@evst/react";

const fromCounter = events("Counter", {
  incremented: props<number>(),
  reset: emptyProps(),
});

export const counter = state("counter", { count: 0 })
  .extraViews(({ count }) => ({ doubled: view(count, (count) => count * 2) }))
  .handle((on) => ({
    add: on(fromCounter.incremented, (state, amount) => {
      state.count += amount;
    }),
    reset: on(fromCounter.reset, (state) => {
      state.count = 0;
    }),
  }));
```

State handlers receive event data directly as their second argument. Both returned
immutable updates and Immer-style mutations are supported.

## Configuring the store

```ts
import { Provider } from "react-redux";
import { createEvstStore } from "@evst/react";
import { counter } from "./counter";

const store = createEvstStore({ features: [counter] });

export function AppRoot() {
  return <Provider store={store}>{/* application */}</Provider>;
}
```

Views expose `.use()` for components under the matching React Redux provider. Events expose `.publish()` after `createEvstStore()` has configured the application store.

Views also expose `.value()` for a current snapshot outside React:

```ts
const count = counter.views.count.value();
```

Snapshot reads do not subscribe or trigger renders. They use the active store
configured by `createEvstStore()` and throw before initialization or after
`clearEvstStore()`. The `.use()` method remains a React hook.

```ts
function Counter() {
  const count = counter.views.count.use();
  return <button onClick={() => fromCounter.incremented.publish(1)}>{count}</button>;
}
```

## Registering lazy features

The root store can start with only shared features, or with no features.
A lazy route loader registers its features before rendering components:

```ts
const store = createEvstStore({ features: [authState, coreState] });

// Inside the lazy feature loader:
store.provide({ features: [booksState], tasks: [booksTasks] });
```

Repeated registration of the same definitions does not reset state or duplicate
listeners. A different state definition with an already registered name throws.
Registered state and tasks remain installed for the store lifetime, including
across route unmounts. Task definitions should be stable instances.

## Defining tasks

Tasks receive event data directly and return an optional outcome event. EVST
publishes returned outcomes through the store running the task. Handlers receive only event data; View `.value()` provides typed snapshot reads.

```ts
import { task } from "@evst/react";

const counterTasks = task.handle((on) => ({
  persist: on(fromCounter.incremented, async () => {
    await saveCounter(counter.views.count.value());
  }),
}));

const store = createEvstStore({ features: [counter], tasks: [counterTasks] });
```

One active publisher is supported per loaded package. Server-rendered or independently mounted applications should dispatch with their own Redux store rather than using `.publish()`.

Like event publishing, `.value()` uses the active store. Task handlers also read this store through View `.value()`.

The task API is `on(event, handler)`. Each event invokes its handler independently,
and EVST publishes each returned outcome. Debouncing and request-order policies
belong in application utilities. There is no task options argument.

Migration from the earlier React API replaces `{ payload: { query } }` with
`{ query }`, `api.getState()` with View `.value()`, and outcome dispatches or
publishes with returned events. The raw `TaskApi`, `TaskContext`, and root-state generic on
`task.handle()` have been removed.
