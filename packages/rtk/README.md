# @evst/rtk

`@evst/rtk` is a minimalist, event-driven layer on Redux Toolkit. It organizes
feature code around events, views, state, and tasks while retaining a standard
Redux Toolkit store, React Redux `Provider`, and Redux ecosystem compatibility.

- [Installing](#installing)
- [Writing provider code](#writing-provider-code)
  - [Modeling events](#modeling-events)
  - [Implementing State and Views](#implementing-state-and-views)
  - [Implementing Tasks](#implementing-tasks)
- [Writing consumer code](#writing-consumer-code)
- [Configuring the store](#configuring-the-store)
  - [Registering lazy state](#registering-lazy-state)
- [Enforcing event conventions](#enforcing-event-conventions)
- [Testing and developing](#testing-and-developing)
- [Working with Redux Toolkit](#working-with-redux-toolkit)
- [Exploring the Books examples](#exploring-the-books-examples)

## Installing

In a React application:

```sh
npm install @evst/rtk @reduxjs/toolkit react-redux
```

The package supports Redux Toolkit 2, React 18 or 19, and React Redux 8 or 9.
Events describe occurrences, Views expose state, State handles transitions,
and Tasks perform external work. The
[shared programming model](https://github.com/fredyang/evst#understanding-the-programming-model)
explains the rationale and conventions; this guide applies them to a Books feature.

## Writing provider code

### Modeling events

An event group is defined by its authoritative source. The `fromSource` naming
convention identifies where an event happened, such as `fromBooksPage` and
`fromBooksApi`, rather than the state or task that handles it.

```ts
import { emptyProps, events, props } from "@evst/rtk";

export interface Book {
  id: string;
  title: string;
}

export const fromBooksPage = events("Books Page", {
  entered: emptyProps(),
  bookSelected: props<{ id: string }>(),
});

export const fromBooksApi = events("Books API", {
  loaded: props<{ books: Book[] }>(),
  loadFailed: props<{ message: string }>(),
});
```

An event key is a camel-case identifier such as `bookSelected`. EVST derives a
readable RTK action type - `[Books Page] Book Selected` - and each event creator
remains a standard Redux action creator. Events therefore work with RTK
reducers, listener middleware, DevTools, and direct `store.dispatch(...)`.

Events preserve the native RTK action shape: `type` and `payload`.
EVST does not add `source` or `name` metadata fields.

Event creators expose readonly `eventSource` and `eventName` properties with literal
types. These properties belong to the creator, not to emitted events.

```ts
fromBooksPage.entered.eventSource; // "Books Page"
fromBooksPage.entered.eventName; // "Entered"
fromBooksPage.entered.type; // "[Books Page] Entered"
```

### Implementing State and Views

A **View** is a read-only projection of underlying state. It exposes a stored
value or derives a value from other Views without changing state. The term
refers to a data view, not a UI component, template, or screen. Views describe
how state is read, not how it is displayed; Components, Tasks, and other
application logic can consume them. State changes belong in event-driven state
handlers.

`evst()` infers feature state from its initial-state object and creates a typed
View for every top-level field. `.view()` composes derived Views and
`.state()` declares event subscriptions through named state handlers.
`NamedStateHandlers<State>` is a record of `StateHandler<State>` values returned
by the supplied `on` builder. Each call returns a new state definition;
registration through `createEvstStore()` or `store.provide()` activates its subscriptions.

```ts
import { evst, view } from "@evst/rtk";
import { fromBooksApi, fromBooksPage, type Book } from "./books.events";

const initialState = {
  books: [] as Book[],
  selectedId: null as string | null,
  loading: false,
  error: null as string | null,
};

export const booksState = evst("books", initialState)
  .view(({ books, selectedId }) => ({
    selectedBook: view(
      books,
      selectedId,
      (books, id) => books.find((book) => book.id === id) ?? null,
    ),
  }))
  .state((on) => ({
    beginLoading: on(fromBooksPage.entered, (current) => {
      current.loading = true;
      current.error = null;
    }),
    storeBooks: on(fromBooksApi.loaded, (current, { books }) => {
      current.books = books;
      current.loading = false;
    }),
    showLoadFailure: on(fromBooksApi.loadFailed, (current, { message }) => {
      current.loading = false;
      current.error = message;
    }),
    selectBook: on(fromBooksPage.bookSelected, (current, { id }) => {
      current.selectedId = id;
    }),
  }));

export const booksViews = booksState.views;
```

State handlers receive event data directly as their second argument. RTK's
Immer-powered mutations and returned immutable updates are both supported.

### Implementing Tasks

Standalone Tasks use `task((on) => ({ ... }))`; State handlers use `.state()`. The callback
declares `NamedTasks`, a record of `Task` values created with `on()`. Each Task
can respond to an event, changes in one or more Views, or an external source.
All effects can return an event, a cleanup function, or nothing, either directly
or through a Promise. Effects can also publish events with `event.publish()`.

`task()` returns a task collection. Listeners start when the collection
is registered through `createEvstStore()` or `store.provide()`.

```ts
import { task } from "@evst/rtk";
import { fromBooksApi, fromBooksPage } from "./books.events";
import { booksApi } from "./books-api";

export const booksTasks = task((on) => ({
  load: on(fromBooksPage.entered, async () => {
    try {
      const books = await booksApi.load();
      return fromBooksApi.loaded({ books });
    } catch {
      return fromBooksApi.loadFailed({ message: "Could not load books." });
    }
  }),
}));
```

`booksApi.load()` is an application service returning `Promise<Book[]>`.
Each published event invokes each matching Task independently. Request
ordering, cancellation, and debouncing remain application concerns.

Tasks support three subscription forms:

- `on(event, effect)` runs when the event is published.
- `on(view1, view2, ..., effect)` runs when any selected View value changes.
- `on(effect)` runs once on registration, typically to start an external subscription.

All three forms accept the same effect return values:

| Return value                      | Behavior                          |
| --------------------------------- | --------------------------------- |
| Event object with a string `type` | Dispatch the event                |
| Function                          | Save it as cleanup                |
| `undefined`                       | Do nothing                        |
| Promise of any of these           | Await it and apply the same rules |

Effects can also publish events directly with `event.publish()`. Other return
values are rejected by TypeScript and ignored at runtime. No `dispatch: false`
option is needed.

For event and View Tasks, previous cleanup runs before the next invocation.
The final cleanup runs when the Task stops. If an older asynchronous invocation
returns cleanup after a newer invocation starts, that older cleanup runs
immediately. Cleanup returned after stopping also runs immediately; returned
events are ignored after stopping. Overlapping asynchronous effects are not
automatically cancelled, and their returned events can arrive out of order.
Rejected startup Promises are reported to the console while the Task is active;
synchronous startup errors propagate to the registration caller.

```ts
const browserTasks = task((on) => ({
  // Returns an event for automatic dispatch.
  started: on(() => fromUser.activityDetected()),
  // Replaces the listener when the selected book changes.
  activity: on(booksViews.selectedId, (id) => {
    if (id === null) return;
    const clicked = () => fromUser.activityDetected.publish();
    document.addEventListener("click", clicked);
    return () => document.removeEventListener("click", clicked);
  }),
  // Returns nothing; no dispatch or cleanup is needed.
  log: on(() => {
    console.info("Tasks started");
  }),
}));
```

Event-triggered Tasks read current View values directly with `.snapshot`; no
additional Task option is needed:

```ts
load: on(fromBooksPage.entered, async () => {
  if (booksViews.books.snapshot.length) return;
  return fromBooksApi.loaded({ books: await booksApi.load() });
}),
```

The event triggers the Task after its state transitions. `.snapshot` reads the
active store at the point of the call; it does not subscribe to changes. A read
after an `await` can therefore return a newer value than a read before it.

Tasks can also use a View as their source, without an event trigger:

```ts
const selectionTasks = task((on) => ({
  selectionChanged: on(booksViews.selectedId, (id) => {
    if (id === null) return;
    return fromBooksPage.bookSelected({ id });
  }),
}));
```

Multiple Views can be passed before the effect. The callback receives their
current values as separate, inferred arguments:

```ts
on(
  booksViews.selectedId,
  booksViews.loading,
  booksViews.error,
  (selectedId, loading, error) => {
    // React to changes in any of the three Views.
  },
);
```

The Task runs once per state transition when any selected value changes. All
arguments come from the same current state snapshot, including values of Views
that did not change.

A View Task starts listening when registered and runs only when its selected
value changes according to `Object.is`. Registration does not emit the initial
value. The effect receives the new value after state transitions and can return
an event, cleanup function, or nothing, synchronously or asynchronously. Unrelated state changes do not
trigger it. As with event Tasks, stopping the collection cancels pending outcome
dispatches. Outcome events that change the source View can trigger the Task
again, so such feedback requires a terminating condition.

External sources such as DOM events, timers, and subscription APIs can use
`on(effect)`. The effect takes no arguments and follows the same return-value rules.
For subscriptions, callbacks publish events with `event.publish()` and the
effect returns cleanup:

```ts
const browserTasks = task((on) => ({
  activity: on(() => {
    const clicked = () => fromUser.activityDetected.publish();
    document.addEventListener("click", clicked);
    return () => document.removeEventListener("click", clicked);
  }),
}));
```

The effect runs on registration, rather than declaration. Events can be
published synchronously during setup or later from callbacks. Cleanup runs when
the collection is stopped or `clearEvstStore()` is called. Cleanup should remove
listeners, clear timers, and unsubscribe from subscriptions so they no longer
publish events. Pending asynchronous work should be cancelled or guarded by the
effect if it can finish after cleanup.

A source can bridge an observable without making RxJS a dependency: subscribe
with a callback that calls `event.publish()` and return a function that
unsubscribes. Effects can also return Promises of events, cleanup functions, or `undefined`.

### Bundling Tasks with State

Every `.state()`, `.view()`, and `.task()` call returns a new composable
`EvstDefinition`. Calls may be repeated in any order. A Task callback receives
all generated and derived Views available at that point, with their inferred
types. Later calls retain earlier Tasks and do not rerun their callbacks.
`effects` exists only on definitions that have passed through `.task()`.

```ts
const booksBundle = evst("books", { books: [] as Book[] })
  .state((on) => ({
    loaded: on(fromBooksApi.loaded, (current, { books }) => {
      current.books = books;
    }),
  }))
  .task((on, views) => ({
    load: on(fromBooksPage.entered, async () => {
      if (views.books.snapshot.length) return;
      return fromBooksApi.loaded({ books: await booksApi.load() });
    }),
  }));

const store = createEvstStore(booksBundle);
// Alternatively, register with an existing store:
// store.provide(booksBundle);
```

Feature registration installs its state before starting its Tasks. Repeated
registration of the same bundle preserves state and avoids duplicate listeners;
a different reducer using the same state name replaces the registered reducer. Clearing the
store stops bundled Tasks, including external source cleanup.

The [Auth example](../../examples/projects/evst-rtk-books/src/auth/evst/auth.evst.ts)
combines Events, Views, State, and Tasks in one file. Larger features can retain
separate definitions with `.state()` and standalone `task()`.

### Extending feature definitions

Composition can be split across files. Each step imports its predecessor and
exports the extended definition; registration uses the final result:

```ts
// books.base.ts
export const booksBase = evst("books", { count: 0 });

// books.views.ts
export const booksWithViews = booksBase.view(({ count }) => ({
  doubled: view(count, (count) => count * 2),
}));

// books.evst.ts
export const booksEvst = booksWithViews
  .task((on, views) => ({/* tasks using doubled */}))
  .view(({ doubled }) => ({ text: view(doubled, String) }))
  .task((on, views) => ({/* tasks using doubled and text */}));
```

Earlier definitions remain unchanged. Discarding a method's return value also
discards that extension. Existing views and task objects retain their identities.

Duplicate derived View names, state-handler labels, and Task labels throw during
composition. View names cannot replace generated field views or `root`. A feature
can handle each event type only once in State, even across separate `.state()`
calls. Multiple differently named Tasks can respond to that event. Different
features can independently handle the same event. State and Task labels have
separate namespaces.

Standalone `view()` composes Views from different features:

```ts
const canEditBook = view(
  authEvst.views.loggedIn,
  booksEvst.views.selectedBook,
  (loggedIn, book) => loggedIn && Boolean(book),
);
```

## Writing consumer code

Components consume a View with `.use()` and publish an event with `.publish()`.
They do not need to select or dispatch directly for EVST-defined features.

```tsx
import { useEffect } from "react";
import { fromBooksPage } from "./books.events";
import { booksViews } from "./books.state";

export function BooksPage() {
  const books = booksViews.books.use();
  const loading = booksViews.loading.use();
  const error = booksViews.error.use();

  useEffect(() => fromBooksPage.entered.publish(), []);

  if (loading) return <p>Loading books...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <ul>
      {books.map((book) => (
        <li key={book.id}>
          <button
            onClick={() => fromBooksPage.bookSelected.publish({ id: book.id })}
          >
            {book.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

Views are also callable selectors, so they can be passed to `useSelector`, used
with `store.getState()`, or composed into another `view()`. `.snapshot` reads a
current value through a read-only getter without subscribing. Each access reads
the latest state; a previously captured value remains a snapshot:

```ts
const selectedBook = booksViews.selectedBook.snapshot;
```

## Configuring the store

`createEvstStore()` returns the actual enhanced Redux Toolkit store with one added
method: `provide()`. It is passed directly to React Redux's standard Provider.

```tsx
import { createEvstStore } from "@evst/rtk";
import { Provider } from "react-redux";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";
import { BooksPage } from "./books-page";

export const store = createEvstStore(booksState, booksTasks);

export function AppRoot() {
  return (
    <Provider store={store}>
      <BooksPage />
    </Provider>
  );
}
```

`store.dispatch`, `store.getState`, `store.subscribe`, and `store.replaceReducer`
remain standard Redux store methods. The optional final argument configures
Redux Toolkit, including preloaded state, DevTools, middleware, and enhancers:

```ts
const store = createEvstStore(booksState, booksTasks, {
  devTools: false,
  middleware: (defaults) => defaults().concat(logger),
});
```

EVST supplies the reducer, so `reducer` is excluded from the options. Custom
middleware is composed with the required EVST listener middleware. Enhancers
that remove the middleware enhancer also disable Task delivery, as with any RTK
listener middleware. State, dispatch, and enhancer extensions retain inferred
types. Lazy `.provide()` calls do not change the original store's static state type.

Events' `.publish()` and Views' `.snapshot` use the active store configured by
`createEvstStore()`. One active EVST store is supported per loaded package. Server
rendering or independently mounted applications with separate stores require
explicit store dispatch and selector calls instead of the shared helpers.
A second `createEvstStore()` call throws while a store is active. `clearEvstStore()`
stops registered Tasks and clears the active reference for test isolation.

### Registering lazy state

A root store can begin with shared state only, or with no feature state. A lazy
route module registers its state definitions and tasks before rendering the
feature.

```ts
const store = createEvstStore(authState);

store.provide(booksState, booksTasks);
```

Repeated registration of the same definitions does not reset state or duplicate
task listeners. Registering a different reducer with an existing name replaces
that reducer, following Redux reducer-map semantics; current state is retained.
Previously registered Tasks remain active until store cleanup. Registered state and tasks remain installed for the store lifetime.

## Enforcing event conventions

`@evst/eslint-plugin` provides an `rtk` preset for shared EVST conventions,
including source naming, publisher ownership, duplicate state handlers, and
unused events and derived Views. It supports TypeScript and TSX. The
[plugin guide](https://github.com/fredyang/evst/tree/main/packages/eslint-plugin#configuring-eslint) documents
configuration, type-aware analysis, and rule limitations.

In `eslint.config.mjs`, after installing `@evst/eslint-plugin`, `eslint`,
and `typescript-eslint` as development dependencies:

```js
import evst from "@evst/eslint-plugin";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { evst },
    ...evst.configs.rtk,
  },
];
```

The lint TypeScript project includes application sources and excludes tests;
the plugin guide provides a complete example. This preset includes shared
rules and excludes Angular-specific checks.

From the repository root, the Books example can be checked with:

```sh
npm run lint:evst-rtk-books
```

## Testing and developing

A state definition exposes its generated reducer, so state transitions can be
tested without React or a store:

```ts
import { expect, it } from "vitest";
import { booksState } from "./books.state";
import { fromBooksApi, fromBooksPage } from "./books.events";

it("selects a loaded book", () => {
  const book = { id: "42", title: "The Hobbit" };
  const loaded = booksState.reducer(
    undefined,
    fromBooksApi.loaded({ books: [book] }),
  );
  const selected = booksState.reducer(
    loaded,
    fromBooksPage.bookSelected({ id: book.id }),
  );

  expect(selected.selectedId).toBe(book.id);
});
```

Tasks can be tested with an EVST store and mocked application dependencies.
Publishing the source event and asserting the resulting View or store state
tests the complete task-to-outcome path.

From the repository root:

```sh
npm test --workspace @evst/rtk
npm pack --workspace @evst/rtk
```

## Working with Redux Toolkit

Events are RTK action creators, State exposes an RTK reducer, and Views are
callable selectors. Composed Views use RTK's `createSelector`. Tasks register
listeners through `createListenerMiddleware`; `createEvstStore()` uses
`configureStore` with default middleware plus the task listener middleware.

The returned store works directly with React Redux and Redux DevTools.
Entity adapters can be used within feature reducers. The feature definitions supply the reducer map. Other Redux Toolkit options
belong in the optional final argument to `createEvstStore()`.

## Exploring the Books examples

[`evst-rtk-books`](https://github.com/fredyang/evst/tree/main/examples/projects/evst-rtk-books) uses EVST with React
and Material UI. [`rtk-books`](https://github.com/fredyang/evst/tree/main/examples/projects/rtk-books) implements
the same application directly with Redux Toolkit, making the feature-level
differences easy to compare.
