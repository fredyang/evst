# @evst/ngrx

`@evst/ngrx` connects Event, View, State, and Task to Angular and NgRx Store.
Components read Views and publish events; State and Task define the responses.
The [shared programming model](https://github.com/fredyang/evst#understanding-the-programming-model)
explains the rationale and conventions. This guide covers the NgRx implementation
with a Books feature.

- [Installing](#installing)
- [Writing provider code](#writing-provider-code)
  - [Modeling events](#modeling-events)
  - [Implementing State and Views](#implementing-state-and-views)
  - [Implementing Tasks](#implementing-tasks)
- [Writing consumer code](#writing-consumer-code)
- [Registering EVST](#registering-evst)
  - [Registering route features](#registering-route-features)
- [Enforcing event conventions](#enforcing-event-conventions)
- [Testing and developing](#testing-and-developing)
- [Working with NgRx](#working-with-ngrx)
- [Exploring the Books examples](#exploring-the-books-examples)

## Installing

An Angular application with compatible NgRx 22 dependencies requires:

```sh
npm install @evst/ngrx @ngrx/store@^22 @ngrx/effects@^22 @ngrx/store-devtools@^22
```

## Writing provider code

### Modeling events

An event group is defined by its authoritative source. Its variable uses the
`fromSource` naming convention, such as `fromBooksPage` and `fromBooksApi`.
The name identifies where an event happened, not which State or Task handles
it. The `event-group-source-prefix` rule in `@evst/eslint-plugin` enforces this
convention and discourages command-oriented names.

```ts
import { emptyProps, props } from "@ngrx/store";
import { events } from "@evst/ngrx";

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

An event key is a camelCase identifier, such as `bookSelected`. EVST derives the
readable NgRx type `[Books Page] Book Selected` while preserving the same
identifier at its definition and every use. Each event therefore remains
discoverable through standard IDE navigation and Find References. Each event creator
produces a standard NgRx Action, so events work with existing NgRx reducers,
effects, and DevTools.

### Implementing State and Views

`state()` infers the feature-state shape from its initial-state object and
automatically exposes a typed View for each top-level field. Optionally,
`.extraViews()` composes derived Views from those default Views. `.handle()`
adds named, pure event handlers; names document each state transition.

```ts
import { state, view } from "@evst/ngrx";
import { fromBooksApi, fromBooksPage, type Book } from "./books.events";

const initialState = {
  books: [] as Book[],
  selectedId: null as string | null,
  loading: false,
  error: null as string | null,
};

export const booksState = state("books", initialState)
  // Generated Views: books, selectedId, loading, and error.
  // Additional Views can compose these generated Views.
  .extraViews(({ books, selectedId }) => ({
    selectedBook: view(
      books,
      selectedId,
      (books, id) => books.find((book) => book.id === id) ?? null,
    ),
  }))
  // Named event handlers define pure state transitions.
  .handle((on) => ({
    beginLoading: on(fromBooksPage.entered, (current) => ({
      ...current,
      loading: true,
      error: null,
    })),
    storeBooks: on(fromBooksApi.loaded, (current, { books }) => ({
      ...current,
      books,
      loading: false,
    })),
    showLoadFailure: on(fromBooksApi.loadFailed, (current, { message }) => ({
      ...current,
      loading: false,
      error: message,
    })),
    selectBook: on(fromBooksPage.bookSelected, (current, { id }) => ({
      ...current,
      selectedId: id,
    })),
  }));

// Views also include the derived selectedBook.
export const booksViews = booksState.views;
```

### Implementing Tasks

State and Task share the `handle((on) => ({ ... }))` definition shape. In both,
`on()` associates one or more events with a named handler. State handlers return
the next immutable state; Task handlers receive an event-filtered pipeline and
return outcome events. Each Task handler creates a functional NgRx Effect with
`createEffect()`. Handler object keys document intent; the events passed to
`on()` determine what each handler receives. Task keys are also exposed under
`.effects`.

```ts
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { task } from "@evst/ngrx";
import { catchError, exhaustMap, map, of } from "rxjs";
import { fromBooksApi, fromBooksPage, type Book } from "./books.events";

export const booksTasks = task.handle((on) => ({
  load: on(fromBooksPage.entered, (pipe, http = inject(HttpClient)) => {
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

## Writing consumer code

Consumer code is about consuming Views and publishing events. It does not need
to know which State or Task reacts to an event, keeping it focused on what is
displayed and what happened.

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
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @for (book of books(); track book.id) {
      <button (click)="selectBook(book.id)">{{ book.title }}</button>
    }
  `,
})
export class BooksPageComponent implements OnInit {
  readonly books = booksViews.books.signal();
  readonly loading = booksViews.loading.signal();
  readonly error = booksViews.error.signal();

  ngOnInit(): void {
    fromBooksPage.entered.publish();
  }

  selectBook(id: string): void {
    fromBooksPage.bookSelected.publish({ id });
  }
}
```

The component consumes the `books` and `loading` Views as Signals. It publishes
`fromBooksPage.entered` when the Books Page is entered and
`fromBooksPage.bookSelected` when a user selects a book. Those events belong to
the Books Page event source and are published by that source.

Views are consumed directly as Signals and events are published directly with
`.publish()`. The component does not need `store.select(...)` or
`store.dispatch(...)`.

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

## Registering EVST

`provideEvst()` registers the root NgRx Store and EVST publishing support once.
State and Tasks can be registered separately or as one `bundle()`.

```ts
import { type ApplicationConfig } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";
import { provideEvst } from "@evst/ngrx";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEvst(),
    booksState.provide(),
    booksTasks.provide(),
  ],
};
```

```ts
import { type ApplicationConfig } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { bundle, provideEvst } from "@evst/ngrx";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";

export const booksBundle = bundle(booksState, booksTasks);

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideEvst(), booksBundle.provide()],
};
```

### Registering route features

Feature State and Tasks can also be registered through a route's `providers`.
For a route-based Books feature, the application registers `provideEvst()` once
at the root, and the feature route registers its own definitions.

```ts
// app.config.ts
import { type ApplicationConfig } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, type Routes } from "@angular/router";
import { provideEvst } from "@evst/ngrx";

const routes: Routes = [
  {
    path: "books",
    loadChildren: () => import("./books.routes").then((m) => m.booksRoutes),
  },
];

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideEvst(), provideRouter(routes)],
};
```

```ts
// books.routes.ts
import { type Routes } from "@angular/router";
import { booksState } from "./books.state";
import { booksTasks } from "./books.tasks";

export const booksRoutes: Routes = [
  {
    path: "",
    providers: [booksState.provide(), booksTasks.provide()],
    loadComponent: () =>
      import("./books-page").then((m) => m.BooksPageComponent),
  },
];
```

The route can use `booksBundle.provide()` instead of the separate State and
Task providers. Route providers use Angular's route environment injector;
`provideEvst()` remains registered at the application root. Root registration
and route registration are alternative placements for the same feature
definitions.

## Enforcing event conventions

`@evst/eslint-plugin` provides the complete `evst-ngrx` preset: shared EVST
rules plus Angular View-subscription and NgRx Task-source checks.

```sh
npm install --save-dev @evst/eslint-plugin eslint typescript-eslint
```

In `eslint.config.mjs`:

```js
import evst from "@evst/eslint-plugin";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { evst },
    ...evst.configs["evst-ngrx"],
  },
];
```

The lint TypeScript project includes application sources and excludes tests.
The [plugin guide](https://github.com/fredyang/evst/tree/main/packages/eslint-plugin#configuring-eslint)
provides that configuration and explains analysis limits. Intentional Task-source
and manual View-subscription suppressions require a reason after `--`.
The legacy `evst` preset remains available; `ngrx` is the separate preset for
plain NgRx applications.

## Testing and developing

Each State exposes its generated reducer as `.reducer`, so state transitions can
be tested without an Angular injector or a Store:

```ts
import { expect, it } from "vitest";
import { booksState } from "./books.state";
import { fromBooksApi, fromBooksPage } from "./books.events";

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
import { booksTasks } from "./books.tasks";
import { fromBooksApi, fromBooksPage } from "./books.events";

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
npm test --workspace @evst/ngrx
npm pack --workspace @evst/ngrx
```

The package requires compatible Angular and NgRx 22 dependencies, including
`@ngrx/store`, `@ngrx/effects`, and `@ngrx/store-devtools`.

Generate the API reference from JSDoc and TypeScript signatures:

```sh
npm run docs:api
```

The generated site is written to `packages/ngrx/docs/api/index.html`.

One active EVST Store is supported per loaded module. Concurrent SSR applications
or independent stores require NgRx providers and an injected Store instead of
`provideEvst()` and the shared publication/View helpers.

## Working with NgRx

EVST is a facade over NgRx, not a replacement. Under the hood, it uses native
NgRx APIs to build its objects: event creators produce NgRx Actions, a View is
a callable memoized NgRx selector, State exposes a feature reducer, and a Task
collection exposes functional NgRx Effects.

EVST feature code is normally clearer when it uses Views and events rather than
mixing in direct Store APIs. The underlying NgRx objects remain compatible and
available when direct integration is needed. Entity adapters, router state,
meta-reducers, DevTools, and other standard NgRx APIs can still be used where
they fit the feature.

`provideEvst()` initializes an empty root reducer map and enables Redux DevTools
in Angular development mode. It accepts NgRx root Store configuration and
optional DevTools options:

```ts
provideEvst({
  runtimeChecks: { strictActionSerializability: true },
  devtools: { name: "Books" },
});
```

## Exploring the Books examples

[EVST NgRx Books](https://github.com/fredyang/evst/tree/main/examples/projects/evst-ngrx-books)
demonstrates routing, authentication, and feature state. It can be compared with
[NgRx Books](https://github.com/fredyang/evst/tree/main/examples/projects/ngrx-books)
and its standalone variant in the
[Books overview](https://github.com/fredyang/evst/blob/main/example.md).

License: MIT.
