# NgRx Sugar utilities

## Defining state

`defineState` combines state handlers, memoized views, and optional effects.
The handler callback supplies a state-typed `on` function.

```ts
import { createAction, props } from "@ngrx/store";
import { defineState } from "@ngrx-sugar/store";

const changed = createAction("[Counter] Changed", props<{ amount: number }>());

export const counter = defineState({
  name: "counter",
  initialState: { count: 0 },
  stateHandlers: (on) => [
    on(changed, (state, { amount }) => ({ count: state.count + amount })),
  ],
  extraViews: ({ count }, view) => ({
    doubled: view(count, value => value * 2),
  }),
});

// Application or route providers, with provideStore() at the application root:
// providers: [counter.provide()]
// Component selection: counter.views.count.signal()
```

The returned state definition exposes `views`, `provide()`, and `test`.
`views.root` selects the entire feature state, and each own
enumerable property present in `initialState` gets a view with the same name,
such as `views.count`. State fields should be initialized explicitly.

The optional `extraViews` callback receives the generated views and a `view`
builder. The builder aliases NgRx's `createSelector`, preserving type inference
and memoization without requiring an import. Its inputs are views; its final
callback receives their actual values. Returned views are used directly.

```ts
extraViews: ({ books, search }, view) => ({
  searchResults: view(books, search, (books, search) =>
    search.ids.map(id => books.entities[id])
  ),
})
```

This calculation reuses its previous result when only `collection` changes.
It recalculates when either input view returns a different value, using NgRx's
default `===` comparison. Updates must remain immutable. Views can also be
composed by defining a local view and passing it into another builder call.
`root` is reserved, and extra views cannot overwrite default views.

`test.getNextState` provides typed access for isolated state transition tests:

```ts
const next = counter.test.getNextState(undefined, changed({ amount: 3 }));
```

The `test` property is intended for tests by convention; it is not access-restricted.

Typed NgRx `on(...)`
arrays are also accepted as `stateHandlers`; the callback form avoids explicit
state annotations.

`effects` accepts an effect class, a named functional-effect record, an individual
functional effect, or arrays combining these forms, including readonly arrays.
For example, `effects: [loadCollection, addBookToCollection]` registers both
functional effects without a named object. Inline `functionalEffect(...)` calls
are also accepted as array entries. Named records preserve descriptive effect
keys for diagnostics; individual functions are registered under the key `effect`.

`counter.provide()` takes no arguments and registers the state and its configured
effects. All effects belonging to a state are declared in its `effects` option.
The lower-level `provideFeature()` helper still accepts effects as arguments.

When state and effect modules import each other, view access must be deferred
until the functional effect runs. Module-level reads can access uninitialized
bindings. Circular imports remain sensitive to module evaluation order; deferring
view access does not make every import order safe. Separating shared definitions
into another module avoids that dependency when needed.

Typed event creators and reducer state inference for NgRx 22.

## Creating events

```ts
import { emptyProps, props } from "@ngrx/store";
import { createEventGroup, createEventSource } from "@ngrx-sugar/store";

const events = createEventGroup("Books Page", {
  entered: emptyProps(),
  bookSelected: props<{ id: string }>(),
});

// { type: '[Books Page] Book Selected', id: '42' }
events.bookSelected({ id: "42" });

const api = createEventSource("Books API");
const loaded = api.createEvent("loaded", props<{ ids: string[] }>());
```

Keys remain camelCase while action labels split words and preserve acronyms. Keys must start with a lowercase ASCII letter and contain only ASCII letters and digits. Payload creator functions are also supported; their parameters require explicit types.

## Inferring reducer state

```ts
import { createReducer } from "@ngrx/store";
import type { ReducerState } from "@ngrx-sugar/store";

const reducer = createReducer({ count: 0 });
type State = ReducerState<typeof reducer>; // { count: number }
```

`ReducerState` also supports combined reducers and produces `never` for non-reducer types.

## Developing

From the project root, `npm install` installs workspace dependencies and `npm test --workspace @ngrx-sugar/store` builds the package, checks test types, and runs the utility tests. `npm pack --workspace @ngrx-sugar/store` produces an installable archive.

## Reading views and publishing events

Every view exposed by `defineState`, including `root`, generated field views,
and returned `extraViews`, has `.signal(options?)` and `.observable()` methods:

```ts
readonly count = counter.views.count.signal();
readonly count$ = counter.views.count.observable();
```

Both methods require an injection context. They resolve the current store when
called, so a shared view can be used with different injectors. Views remain
callable memoized selectors with their original projector and cache methods.


`injectView(view, options?)` returns a signal and accepts NgRx signal equality
options. `injectView.observable(view)` returns an observable. Both accept plain
and memoized views and must run in an injection context, such as a component
field initializer or a functional guard's initial invocation.

`injectPublish()` captures the current injection context's store and returns a
function that publishes events. This function can run later in event handlers
or asynchronous callbacks.

```ts
import { Component } from '@angular/core';
import { injectView, injectPublish } from '@ngrx-sugar/store';
import { counter } from './counter.state';
import { CounterEvents } from './counter.events';

@Component({ selector: 'app-counter', template: '{{ count() }}' })
export class CounterComponent {
  readonly count = injectView(counter.views.count);
  readonly count$ = injectView.observable(counter.views.count);
  private readonly publish = injectPublish();

  increment() {
    this.publish(CounterEvents.increment());
  }
}
```

Observable views must be created during injection, before entering asynchronous
callbacks; their subscriptions can run later.
