# NgRx Sugar utilities

NgRx Sugar removes routine Store wiring so application code can focus on state
and events. It keeps the public API deliberately small, encourages an
event-driven model in which something happened rather than a command-driven
model that dictates what to do, and follows the jQuery principle: write less,
do more.

Four runtime APIs define the recommended application structure: `events`,
`state`, `sideEffect`, and `provideStoreSugar`. The types `StateDefinition`,
`SideEffect`, and `StoreSugarConfig` are also exported. NgRx types such as
`Action` and `Actions` retain their original names and imports.

The package requires compatible Angular and NgRx 22 installations, including
`@ngrx/store`, `@ngrx/effects`, and `@ngrx/store-devtools`. DevTools is a required
peer dependency even when registration is disabled, because the module imports it.

## Defining state

`state(name, initialState)` combines typed handlers, memoized views, and optional
effects through an immutable chaining API. No final `.build()` call is required.

```ts
import { props } from "@ngrx/store";
import { events, state } from "@ngrx-sugar/store";

export const CounterEvents = events("Counter", {
  changed: props<{ amount: number }>(),
});

export const counter = state("counter", { count: 0 })
  .on(CounterEvents.changed, (state, { amount }) => ({
    count: state.count + amount,
  }))
  .extraViews(({ count }, view) => ({
    doubled: view(count, (value) => value * 2),
  }));

// Application or route providers, with provideStoreSugar() at the application root:
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
const definition = state("books", initialState);
definition.extraViews(({ books, search }, view) => ({
  searchResults: view(books, search, (books, search) =>
    search.ids.map((id) => books.entities[id]),
  ),
}));
```

This calculation reuses its previous result when only `collection` changes.
It recalculates when either input view returns a different value, using NgRx's
default `===` comparison. Updates must remain immutable. Views can also be
composed by defining a local view and passing it into another builder call.
`root` is reserved, and extra views cannot overwrite default views.

`test.getNextState` provides typed access for isolated state transition tests:

```ts
const next = counter.test.getNextState(
  undefined,
  CounterEvents.changed({ amount: 3 }),
);
```

The `test` property is intended for tests by convention; it is not access-restricted.

Each chained call returns a new definition. `.on()` appends a handler and accepts
multiple event creators before the handler. `.extraViews()` can compose previously
added views and rejects duplicate names. Its callback runs once per call.
Existing definitions and view identities are preserved when a chain is extended.

`.effects()` appends and accepts an effect class, a named functional-effect record, an individual
functional effect, or arrays combining these forms, including readonly arrays.
For example, `.effects([loadCollection, addBookToCollection])` registers both
functional effects without a named object. Inline `sideEffect(...)` calls
are also accepted as array entries. Named records preserve descriptive effect
keys for diagnostics; individual functions are registered under the key `effect`.

`counter.provide()` takes no arguments and registers the state and its configured
effects. All effects belonging to a state are declared in its `.effects()` calls.

When state and effect modules import each other, view access must be deferred
until the functional effect runs. Module-level reads can access uninitialized
bindings. Circular imports remain sensitive to module evaluation order; deferring
view access does not make every import order safe. Separating shared definitions
into another module avoids that dependency when needed.

## Creating events

```ts
import { emptyProps, props } from "@ngrx/store";
import { events } from "@ngrx-sugar/store";

const booksPageEvents = events("Books Page", {
  entered: emptyProps(),
  bookSelected: props<{ id: string }>(),
});

// { type: '[Books Page] Book Selected', id: '42' }
booksPageEvents.bookSelected({ id: "42" });
```

Keys remain camelCase while action labels split words and preserve acronyms. Keys must start with a lowercase ASCII letter and contain only ASCII letters and digits. Payload creator functions are also supported; their parameters require explicit types.

## Defining standalone effects

`sideEffect()` creates a callable functional effect. Emitted events are dispatched
by default; `{ dispatch: false }` supports effects that only perform side effects.
The returned effect exposes `.provide()` for application or route providers,
with a root Store normally supplied by `provideStoreSugar()`.

```ts
import { timer, map } from "rxjs";
import { sideEffect, provideStoreSugar } from "@ngrx-sugar/store";
import { userEvents } from "./user.events";

const idleEffect = sideEffect(() =>
  timer(300_000).pipe(map(() => userEvents.idleTimeout())),
);

const appConfig = {
  providers: [provideStoreSugar(), idleEffect.provide()],
};
```

Effects also remain callable with explicit dependencies in tests. State-owned
effects belong in `state('feature', initialState).effects([idleEffect])` and are registered
by that state's `.provide()` method.

## Developing

From the project root, `npm install` installs workspace dependencies and `npm test --workspace @ngrx-sugar/store` builds the package, checks test types, and runs the utility tests. `npm pack --workspace @ngrx-sugar/store` produces an installable archive.

## Reading views and publishing events

Every view exposed by `state()`, including `root`, generated field views,
and returned `extraViews`, has `.signal(options?)` and `.observable()` methods:

```ts
readonly count = counter.views.count.signal();
readonly count$ = counter.views.count.observable();
```

Both methods require an injection context. They resolve the current store when
called, so a shared view can be used with different injectors. Views remain
callable memoized selectors with their original projector and cache methods.

Event creator `.publish()` methods can run in lifecycle hooks, event handlers,
and asynchronous callbacks after `provideStoreSugar()` initializes.

```ts
import { Component } from "@angular/core";
import { counter, CounterEvents } from "./counter.state";

@Component({ selector: "app-counter", template: "{{ count() }}" })
export class CounterComponent {
  readonly count = counter.views.count.signal();
  readonly count$ = counter.views.count.observable();

  increment() {
    CounterEvents.changed.publish({ amount: 1 });
  }
}
```

Observable views must be created during injection, before entering asynchronous
callbacks; their subscriptions can run later.

## Publishing through event creators

`provideStoreSugar()` creates an empty NgRx root Store, enables Redux DevTools
in Angular development mode, and enables direct publishing through event creators.
Feature state is registered through `.provide()` or `provideState()`.
This root provider replaces separate `provideStore()` and
`provideStoreDevtools()` calls; it belongs in the application shell, not lazy routes.

```ts
// Application providers:
providers: [
  provideStoreSugar({
    devtools: { name: "Books" },
    runtimeChecks: { strictActionSerializability: true },
  }),
  books.provide(),
];

// Lifecycle hooks, event handlers, or asynchronous callbacks:
CollectionPageEvents.enter.publish();
SelectedBookPageEvents.addBook.publish({ book });
```

Publishing accepts the same typed arguments as creating an event. Published
values remain plain NgRx actions, and creators retain their action type and
reducer/effect compatibility. Registration must finish before publishing.

The root reducer map is empty, so no reducer is registered directly at the root.
Registered feature keys still form the Store's runtime state. DevTools can be
disabled with `devtools: false`; it is never registered outside Angular
development mode. Omitted DevTools options use the connection name
`NgRx Sugar Store`; custom objects and factories are forwarded without merging.

One active Store is supported per loaded Sugar module. A different active Store
is rejected, and registration is released when its owning injector is destroyed.
Repeated registrations of the same Store remain active until all owners are destroyed.
Federated applications can share the root Store and Sugar singleton, with remote
features registered through `provideState()`. Concurrent SSR applications and
independent stores require NgRx providers and an injected `Store` instead of
`provideStoreSugar()` and event creator `.publish()` methods.
View `.signal()` and `.observable()` methods still resolve their local injection context.

## Testing state

Pure state tests need no Angular injector or root Store:

```ts
import { expect, it } from "vitest";
import { counter, CounterEvents } from "./counter.state";

it("adds the requested amount", () => {
  const next = counter.test.getNextState(
    undefined,
    CounterEvents.changed({ amount: 3 }),
  );
  expect(next).toEqual({ count: 3 });
});
```

Component tests that call `.publish()` can register `provideStoreSugar({ devtools:
false })` before `provideMockStore(...)` in TestBed providers. The mock then replaces
the injected Store. TestBed initialization runs the publishing initializer, and
injector teardown clears registration between tests.
