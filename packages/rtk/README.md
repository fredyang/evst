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

### Implementing State and Views

`state()` infers feature state from its initial-state object and creates a typed
View for every top-level field. `.extraViews()` composes derived Views and
`.stateOn()` declares event subscriptions through named state handlers.
`NamedStateHandlers<State>` is a record of `StateHandler<State>` values returned
by the supplied `on` builder. Each call returns a new state definition;
registration through `createEvstStore()` or `evst.provide()` activates its subscriptions.

```ts
import { state, view } from "@evst/rtk";
import { fromBooksApi, fromBooksPage, type Book } from "./books.events";

const initialState = {
  books: [] as Book[],
  selectedId: null as string | null,
  loading: false,
  error: null as string | null,
};

export const booksState = state("books", initialState)
  .extraViews(({ books, selectedId }) => ({
    selectedBook: view(
      books,
      selectedId,
      (books, id) => books.find((book) => book.id === id) ?? null,
    ),
  }))
  .stateOn((on) => ({
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

Standalone Tasks use `taskOn((on) => ({ ... }))`; State handlers use `.stateOn()`. The callback
declares `NamedTasks`, a record of `Task` values created with `on()`. Each Task
can respond to an event, changes in one or more Views, or an external source.
Event and View effects return optional outcome events; external sources emit
outcome events through a callback. Outcomes are dispatched through the RTK store.

`taskOn()` returns a task collection. Listeners start when the collection
is registered through `createEvstStore()` or `evst.provide()`.

```ts
import { taskOn } from "@evst/rtk";
import { fromBooksApi, fromBooksPage } from "./books.events";
import { booksApi } from "./books-api";

export const booksTasks = taskOn((on) => ({
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
- `on(source)` starts an external subscription that emits outcome events.

Event-triggered Tasks read current View values directly with `.value()`; no
additional Task option is needed:

```ts
load: on(fromBooksPage.entered, async () => {
  if (booksViews.books.value().length) return;
  return fromBooksApi.loaded({ books: await booksApi.load() });
}),
```

The event triggers the Task after its state transitions. `.value()` reads the
active store at the point of the call; it does not subscribe to changes. A read
after an `await` can therefore return a newer value than a read before it.

Tasks can also use a View as their source, without an event trigger:

```ts
const selectionTasks = taskOn((on) => ({
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
a synchronous or asynchronous outcome event. Unrelated state changes do not
trigger it. As with event Tasks, stopping the collection cancels pending outcome
dispatches. Outcome events that change the source View can trigger the Task
again, so such feedback requires a terminating condition.

External sources such as DOM events, timers, and subscription APIs can use
`on(source)`. The source receives an `emit` callback for outcome events and can
return a cleanup function:

```ts
const browserTasks = taskOn((on) => ({
  activity: on((emit) => {
    const clicked = () => emit(fromUser.activityDetected());
    document.addEventListener("click", clicked);
    return () => document.removeEventListener("click", clicked);
  }),
}));
```

The source starts on registration, rather than declaration. Each `emit` call
dispatches through the registering store, including synchronous emissions during
setup. Cleanup runs when the collection is stopped or `clearEvstStore()` is
called; emissions after cleanup are ignored. A source can bridge an observable
without making RxJS a dependency: subscribe with `emit` and return a function
that unsubscribes. Source functions themselves are synchronous; asynchronous
work delivers its outcomes through `emit`.

### Bundling Tasks with State

`.stateOn()` returns a new composable state definition. `.taskOn((on, views) =>
({ ... }))` finishes the chain with a bundle containing `name`, `views`, `reducer`,
`effects`, and `register()`. Generated and derived Views retain their inferred
types. The original state definition remains unchanged.

```ts
const booksBundle = state("books", { books: [] as Book[] })
  .stateOn((on) => ({
    loaded: on(fromBooksApi.loaded, (current, { books }) => {
      current.books = books;
    }),
  }))
  .taskOn((on, views) => ({
    load: on(fromBooksPage.entered, async () => {
      if (views.books.value().length) return;
      return fromBooksApi.loaded({ books: await booksApi.load() });
    }),
  }));

const evst = createEvstStore({ bundles: [booksBundle] });
// Alternatively, register with an existing store:
// evst.provide({ bundles: [booksBundle] });
```

Bundle registration installs its state before starting its Tasks. Repeated
registration of the same bundle preserves state and avoids duplicate listeners;
a different definition using the same state name is rejected. Clearing the
store stops bundled Tasks, including external source cleanup.

The [Auth example](../../examples/projects/evst-rtk-books/src/auth/evst/auth.evst.ts)
combines Events, Views, State, and Tasks in one file. Larger features can retain
separate definitions with `.stateOn()` and standalone `taskOn()`.

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
with `store.getState()`, or composed into another `view()`. `.value()` reads a
current snapshot outside React without subscribing:

```ts
const selectedBook = booksViews.selectedBook.value();
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

export const evst = createEvstStore({
  states: [booksState],
  tasks: [booksTasks],
});

export function AppRoot() {
  return (
    <Provider store={evst}>
      <BooksPage />
    </Provider>
  );
}
```

`evst.dispatch`, `evst.getState`, `evst.subscribe`, and `evst.replaceReducer`
remain the standard RTK store methods. `createEvstStore()` accepts RTK store options
other than `reducer` and `middleware`, plus EVST `states`, `tasks`, and `bundles`; EVST configures those to install its
state definitions and listener middleware.

Events' `.publish()` and Views' `.value()` use the active store configured by
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
const evst = createEvstStore({ states: [authState] });

evst.provide({
  states: [booksState],
  tasks: [booksTasks],
});
```

Repeated registration of the same definitions does not reset state or duplicate
task listeners. Registering a different state definition with an existing name
throws. Registered state and tasks remain installed for the store lifetime.

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
Entity adapters can be used within feature reducers. Custom reducer maps and
middleware configuration are not accepted by `createEvstStore()`; its configuration
owns those two options.

## Exploring the Books examples

[`evst-rtk-books`](https://github.com/fredyang/evst/tree/main/examples/projects/evst-rtk-books) uses EVST with React
and Material UI. [`rtk-books`](https://github.com/fredyang/evst/tree/main/examples/projects/rtk-books) implements
the same application directly with Redux Toolkit, making the feature-level
differences easy to compare.
