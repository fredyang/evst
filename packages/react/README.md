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
    add: on(fromCounter.incremented, (state, action) => {
      state.count += action.payload;
    }),
    reset: on(fromCounter.reset, (state) => {
      state.count = 0;
    }),
  }));
```

State handlers use Redux Toolkit case reducers, so immutable updates and Immer-style mutations are both supported. Event payloads use Redux Toolkit's `action.payload` convention.

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

```ts
function Counter() {
  const count = counter.views.count.use();
  return <button onClick={() => fromCounter.incremented.publish(1)}>{count}</button>;
}
```

## Defining tasks

Tasks wrap Redux Toolkit listener middleware. They respond to an event and may dispatch outcome events through `api.dispatch`.

```ts
import { task } from "@evst/react";

const counterTasks = task.handle((on) => ({
  persist: on(fromCounter.incremented, async (_action, api) => {
    await saveCounter(api.getState());
  }),
}));

const store = createEvstStore({ features: [counter], tasks: [counterTasks] });
```

One active publisher is supported per loaded package. Server-rendered or independently mounted applications should dispatch with their own Redux store rather than using `.publish()`.
