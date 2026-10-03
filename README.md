<h1 align="center">EVST - Event, View, State, Task</h1>

<p align="center">
  <strong>The minimalist, event-driven facade for NgRx Store.</strong>
</p>

- [Why EVST?](#why-evst)
- [Understanding the model](#understanding-the-model)
- [Provider code](#provider-code)
  - [Modeling events](#modeling-events)
  - [Modeling State and Views](#modeling-state-and-views)
  - [Defining Tasks](#defining-tasks)
- [Consumer code](#consumer-code)
- [Registering state](#registering-state)
- [Using the ESLint rules](#using-the-eslint-rules)
- [Working with NgRx](#working-with-ngrx)
- [Testing and developing](#testing-and-developing)

## Why EVST?

NgRx is event-driven at its core: Actions describe what happened, and reducers
and effects decide how the application responds. Its APIs also permit
command-shaped Actions that coordinate a specific response. EVST makes an
event-first style explicit when using NgRx.

NgRx is a high-quality implementation of the Redux pattern, but its low-level
APIs expose many implementation details: Actions, reducers, selectors, effects,
and providers. EVST aligns them around Event, View, State, and Task, using a
fluent API to reduce the boilerplate needed for a feature without replacing
NgRx.

## Understanding the coding model

The four EVST objects form the provider API. Components are consumer code and
interact only with Views and events.

![EVST coding model](images/ngrx-evntify-coding-model.png)

| Object    | Role                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| **Event** | Describes something that happened and is published by its source.                     |
| **View**  | Exposes read-only state to consumer code.                                             |
| **State** | Handles events through pure state transitions and provides Views.                     |
| **Task**  | Handles events, performs asynchronous or imperative work, and returns outcome events. |

The diagram separates EVST code into provider and consumer roles. Provider code
defines how State transitions in response to events, which Views expose state,
and how Tasks handle events and return outcome events. Consumer code reads Views
and publishes events.

## Provider code

### Modeling events

An event group is defined by its authoritative source. Its variable uses the
`fromSource` naming convention, such as `fromBooksPage` and `fromBooksApi`.
The name identifies where an event happened, not which State or Task handles
it, and discourages command-oriented names.

```ts
import { emptyProps, props } from "@ngrx/store";
import { events } from "@evst/store";

interface Book {
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

An event key is a camelCase identifier, such as `bookSelected`. EVST derives the
readable NgRx type `[Books Page] Book Selected` while preserving the same
identifier at its definition and every use. Each event therefore remains
discoverable through standard IDE navigation and Find References. Each event creator
produces a standard NgRx Action, so events work with existing NgRx reducers,
effects, and DevTools.

### Modeling State and Views

`state()` infers the feature-state shape from its initial-state object and
automatically exposes a typed View for each top-level field. Optionally,
`.withViews()` composes additional derived Views from those default Views, while
`.on()` mirrors NgRx reducer `on()` semantics by adding pure event handlers.

```ts
import { state, view } from "@evst/store";
import { fromBooksApi, fromBooksPage } from "./books.events";

const initialState = {
  books: [] as Book[],
  selectedId: null as string | null,
  loading: false,
};

export const booksState = state("books", initialState)
  .withViews(({ books, selectedId }) => ({
    selectedBook: view(
      books,
      selectedId,
      (books, id) => books.find((book) => book.id === id) ?? null,
    ),
  }))
  .on(fromBooksPage.entered, (current) => ({
    ...current,
    loading: true,
  }))
  .on(fromBooksApi.loaded, (current, { books }) => ({
    ...current,
    books,
    loading: false,
  }))
  .on(fromBooksPage.bookSelected, (current, { id }) => ({
    ...current,
    selectedId: id,
  }));

export const booksViews = booksState.views;
```

### Defining Tasks

Tasks respond to events and return outcome events. Several independent Tasks
may respond to the same event - for example, one can start an API request while
another records analytics. Like State `.on()`, Task `on()` pairs an event with
its handler. It creates a functional NgRx Effect with `createEffect()` and
filters events for that handler.

```ts
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { tasks } from "@evst/store";
import { catchError, exhaustMap, map, of } from "rxjs";
import { fromBooksApi, fromBooksPage } from "./books.events";

export const booksTasks = tasks((on) => ({
  load: on(fromBooksPage.entered, (pipe) => {
    const http = inject(HttpClient);

    return pipe(
      exhaustMap(() =>
        http.get<Book[]>("/api/books").pipe(
          map((books) => fromBooksApi.loaded({ books })),
          catchError(() =>
            of(fromBooksApi.loadFailed({ message: "Could not load books." })),
          ),
        ),
      ),
    );
  }),
}));
```

## Consumer code

Consumer code reads Views and publishes events rather than coordinating through
`store.select(...)` and `store.dispatch(...)`. It does not need to know which
State or Task reacts to an event, keeping consumer code focused on what is
displayed and what happened.

Publishing events alone does not make code event-driven. An event should have
one publishing boundary, and an executable boundary should publish only one
event. **Publishing the same event in several places, or publishing several
events in sequence, turns events into commands that coordinate work.** The
`event-publisher-ownership` and `no-sequential-event-publishes` ESLint rules
report these patterns.

```ts
import { Component, OnInit } from "@angular/core";
import { fromBooksPage } from "./books.events";
import { booksViews } from "./books.state";

@Component({
  selector: "app-books-page",
  template: `
    @if (loading()) {
      <p>Loading books…</p>
    }
    @for (book of books(); track book.id) {
      <button (click)="selectBook(book.id)">{{ book.title }}</button>
    }
  `,
})
export class BooksPageComponent implements OnInit {
  readonly books = booksViews.books.signal();
  readonly loading = booksViews.loading.signal();

  ngOnInit(): void {
    fromBooksPage.entered.publish();
  }

  selectBook(id: string): void {
    fromBooksPage.bookSelected.publish({ id });
  }
}
```

`.signal()` is the default for component rendering. Views also expose
`.observable()` for RxJS composition or template use with Angular's `AsyncPipe`:

```ts
readonly books$ = booksViews.books.observable();
```

```html
@if (books$ | async; as books) {
<!-- render books -->
}
```

Manual View subscriptions are normally unnecessary. Angular manages the
lifecycle of Signals and `AsyncPipe` subscriptions. Imperative integrations can
use a documented ESLint suppression with automatic teardown.

## Registering state

`provideEvst()` registers the root NgRx Store and EVST publishing support once.
State and Tasks can be registered separately or as one `bundle()`.

```ts
import { type ApplicationConfig } from "@angular/core";
import { provideEvst } from "@evst/store";

export const appConfig: ApplicationConfig = {
  providers: [provideEvst(), booksState.provide(), booksTasks.provide()],
};
```

```ts
import { bundle } from "@evst/store";

export const booksBundle = bundle(booksState, booksTasks);

export const appConfig: ApplicationConfig = {
  providers: [provideEvst(), booksBundle.provide()],
};
```

## Using the ESLint rules

`@evst/eslint-plugin` encodes the event-first conventions:

- The preset requires event groups to use `fromXxx` source-oriented names.
- An event has one publishing boundary.
- One executable boundary publishes one event.
- A State handles an event once.
- Unused events, Views, and Task subscriptions are reported.
- Component code prefers a View Signal or `AsyncPipe` over manual View
  subscriptions.

```ts
import evst from "@evst/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.ts"],
  plugins: { evst },
  ...evst.configs.evst,
});
```

Warnings can be suppressed for intentional exceptions. The EVST preset requires
a reason after `--` for Task-source and manual View-subscription suppressions.

## Working with NgRx

EVST does not replace NgRx. Its events are NgRx actions, State is an NgRx feature
reducer, Views are memoized NgRx selectors, and Tasks are functional NgRx
effects. Standard NgRx APIs, including entity adapters, router state,
meta-reducers, and DevTools, remain available where they fit the feature.

`provideEvst()` initializes an empty root reducer map and enables Redux DevTools
in Angular development mode. It accepts NgRx root Store configuration and
optional DevTools options:

```ts
provideEvst({
  runtimeChecks: { strictActionSerializability: true },
  devtools: { name: "Books" },
});
```

## Testing and developing

Each State exposes its generated reducer as `.reducer`, so state transitions can
be tested without an Angular injector or a Store:

```ts
import { expect, it } from "vitest";

it("selects a book", () => {
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

Task collections expose their generated functional Effects as `.effects`. They
can be invoked directly in a test injector with their dependencies replaced:

```ts
import { HttpClient } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { provideStore, Store } from "@ngrx/store";
import { expect, it } from "vitest";
import { firstValueFrom, of, take, type Observable } from "rxjs";

it("loads books", async () => {
  const book = { id: "42", title: "The Hobbit" };
  TestBed.configureTestingModule({
    providers: [
      provideStore(),
      booksTasks.provide(),
      { provide: HttpClient, useValue: { get: () => of([book]) } },
    ],
  });

  const result = TestBed.runInInjectionContext(() => {
    const load = booksTasks.effects.load as () => Observable<unknown>;
    return firstValueFrom(load().pipe(take(1)));
  });

  TestBed.inject(Store).dispatch(fromBooksPage.entered());

  await expect(result).resolves.toEqual(fromBooksApi.loaded({ books: [book] }));
});
```

From the repository root:

```sh
npm install
npm test --workspace @evst/store
npm pack --workspace @evst/store
```

The package requires compatible Angular and NgRx 22 dependencies, including
`@ngrx/store`, `@ngrx/effects`, and `@ngrx/store-devtools`.

Generate the API reference from JSDoc and TypeScript signatures:

```sh
npm run docs:api
```

The generated site is written to `packages/store/docs/api/index.html`.

## Developing the workspace

The root is a private npm workspace. Commands run from the repository root:

```sh
npm install
npm run build
npm test
```

The ESLint plugin can be tested independently:

```sh
npm test --workspace @evst/eslint-plugin
```

## Packaging

```sh
npm run pack:all
```

This creates installable archives for both packages. The packages retain their
MIT [license](LICENSE). Attribution for the adapted NgRx rule appears in the
[@evst/eslint-plugin README](packages/eslint-plugin/README.md).
