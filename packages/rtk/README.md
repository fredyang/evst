# @evst/rtk

**Event, View, State, Task**

`@evst/rtk` is a minimalist, event-driven layer on Redux Toolkit. It organizes
feature code around events, views, state, and tasks while retaining a standard
Redux Toolkit store, React Redux `Provider`, and Redux ecosystem compatibility.

- [Understanding EVST](#understanding-evst)
- [Understanding the coding model](#understanding-the-coding-model)
- [Defining provider code](#defining-provider-code)
  - [Modeling events](#modeling-events)
  - [Modeling state and views](#modeling-state-and-views)
  - [Defining tasks](#defining-tasks)
- [Writing consumer code](#writing-consumer-code)
- [Configuring the store](#configuring-the-store)
- [Registering lazy state](#registering-lazy-state)
- [Working with Redux Toolkit](#working-with-redux-toolkit)
- [Enforcing event conventions](#enforcing-event-conventions)
- [Testing features](#testing-features)
- [Exploring the Books example](#exploring-the-books-example)

## Understanding EVST

EVST organizes feature code around four concepts: Event, View, State, and Task.
It keeps Redux Toolkit underneath: events are RTK action creators, views are
memoized selectors, state definitions contain RTK reducers, and tasks use RTK
listener middleware.

Redux Toolkit provides flexible primitives such as `createAction`,
`createReducer`, `createSelector`, and listener middleware. EVST connects those
primitives around a feature, making the flow from an event to state, a view, or
a side effect easier to follow without replacing the store.

## Understanding the coding model

| Object    | Role                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| **Event** | Describes something that happened and is published by its source.                     |
| **View**  | Exposes read-only state to React components and imperative integrations.              |
| **State** | Handles events through pure state transitions and exposes Views.                      |
| **Task**  | Handles events, performs asynchronous or imperative work, and returns outcome events. |

Provider code defines events, state, views, and tasks. Consumer code reads
views and publishes events without knowing which state definition or task
reacts to them.

## Defining provider code

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

### Modeling state and views

`state()` infers feature state from its initial-state object and creates a typed
View for every top-level field. `.extraViews()` composes derived Views and
`.handle()` adds named event handlers.

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
  .handle((on) => ({
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

### Defining tasks

Tasks use the same `handle((on) => ({ ... }))` definition shape as state.
Each handler receives event data and returns an optional outcome event. Returned
events are dispatched through the RTK store.

```ts
import { task } from "@evst/rtk";
import { fromBooksApi, fromBooksPage } from "./books.events";
import { booksApi } from "./books-api";

export const booksTasks = task.handle((on) => ({
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

Each published event invokes each matching task handler independently. Request
ordering, cancellation, and debouncing remain application concerns.

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

  useEffect(() => fromBooksPage.entered.publish(), []);

  if (loading) return <p>Loading books...</p>;

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

`createEvst()` returns the actual enhanced Redux Toolkit store with one added
method: `provide()`. It is passed directly to React Redux's standard Provider.

```tsx
import { createEvst } from "@evst/rtk";
import { Provider } from "react-redux";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";

export const evst = createEvst({
  states: [booksState],
  tasks: [booksTasks],
});

export function AppRoot() {
  return <Provider store={evst}>{/* application */}</Provider>;
}
```

`evst.dispatch`, `evst.getState`, `evst.subscribe`, and `evst.replaceReducer`
remain the standard RTK store methods. `createEvst()` accepts RTK store options
other than `reducer` and `middleware`; EVST configures those to install its
state definitions and listener middleware.

Events' `.publish()` and Views' `.value()` use the active store configured by
`createEvst()`. One active EVST store is supported per loaded package. Server
rendering or independently mounted applications should dispatch through their
own store rather than use `.publish()` or `.value()`.

## Registering lazy state

A root store can begin with shared state only, or with no feature state. A lazy
route module registers its state definitions and tasks before rendering the
feature.

```ts
const evst = createEvst({ states: [authState] });

evst.provide({
  states: [booksState],
  tasks: [booksTasks],
});
```

Repeated registration of the same definitions does not reset state or duplicate
task listeners. Registering a different state definition with an existing name
throws. Registered state and tasks remain installed for the store lifetime.

## Working with Redux Toolkit

EVST is an RTK extension, not a replacement. Its store is usable anywhere an
RTK store is expected, and its events are ordinary RTK action creators. Existing
RTK reducers, `createSlice`, `createEntityAdapter`, listener middleware,
DevTools, and React Redux APIs remain available when they fit the application.

## Enforcing event conventions

`@evst/eslint-plugin` provides an `rtk` preset for shared EVST conventions,
including source naming, publisher ownership, duplicate state handlers, and
unused events and derived Views. It supports TypeScript and TSX. The
[plugin guide](../eslint-plugin/README.md#configuring-eslint) documents
configuration, type-aware analysis, and rule limitations.

From the repository root, the Books example can be checked with:

```sh
npm run lint:evst-rtk-books
```

## Testing features

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

```sh
npm test --workspace @evst/rtk
npm pack --workspace @evst/rtk
```

## Exploring the Books example

[`evst-rtk-books`](../../examples/projects/evst-rtk-books) uses EVST with React
and Material UI. [`rtk-books`](../../examples/projects/rtk-books) implements
the same application directly with Redux Toolkit, making the feature-level
differences easy to compare.
