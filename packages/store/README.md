# NgRx Sugar utilities

NgRx Sugar removes routine Store wiring so application code can focus on state
and events. It keeps the public API deliberately small, encourages an
event-driven model in which something happened rather than a command-driven
model that dictates what to do, and follows the jQuery principle: write less,
do more.

NgRx Sugar keeps NgRx infrastructure out of everyday application code.
Components publish events with `.publish()` and consume views with `.signal()`
or `.observable()`, without injecting a Store or calling `dispatch()` and
`select()`. Views wrap memoized selectors, and state definitions bring reducers
and feature registration together behind a small API. Application code focuses
on what happened and what to display, while NgRx manages state underneath.

Four runtime APIs define the recommended application structure: `events`,
`state`, `sideEffect`, and `provideStoreSugar`. The types `StateDefinition`,
`SideEffect`, and `StoreSugarConfig` are also exported. NgRx types such as
`Action` and `Actions` retain their original names and imports.

The package requires compatible Angular and NgRx 22 installations, including
`@ngrx/store`, `@ngrx/effects`, and `@ngrx/store-devtools`. DevTools is a required
peer dependency even when registration is disabled, because the module imports it.

## Defining events

A simplified books page publishes facts about user interactions. The API
publishes facts about the results. The same page event can update state and
trigger an effect without the component coordinating those reactions.

```ts
// books.events.ts
import { emptyProps, props } from "@ngrx/store";
import { events } from "@ngrx-sugar/store";

export interface Book {
  id: string;
  title: string;
}

export const BooksPageEvents = events("Books Page", {
  entered: emptyProps(),
  bookSelected: props<{ id: string }>(),
});

export const BooksApiEvents = events("Books API", {
  booksLoaded: props<{ books: Book[] }>(),
  booksLoadFailed: props<{ message: string }>(),
});
```

`entered` describes what happened at the page. The component does not need to
issue a `loadBooks` command or know which effects react to the event.

Keys remain camelCase while action labels split words and preserve acronyms.
Keys must start with a lowercase ASCII letter and contain only ASCII letters
and digits. Payload creator functions are also supported; their parameters
require explicit types. Calling a creator returns a plain NgRx action:

```ts
BooksPageEvents.bookSelected({ id: "42" });
// { type: '[Books Page] Book Selected', id: '42' }
```

## Defining state and views

`state(name, initialState)` combines typed handlers and memoized views through
an immutable chaining API. No final `.build()` call is required.

```ts
// books.state.ts
import { state } from "@ngrx-sugar/store";
import { BooksApiEvents, BooksPageEvents, type Book } from "./books.events";

interface BooksState {
  books: Book[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: BooksState = {
  books: [],
  selectedId: null,
  loading: false,
  error: null,
};

export const booksState = state("books", initialState)
  .on(BooksPageEvents.entered, (state) => ({
    ...state, loading: true, error: null,
  }))
  .on(BooksApiEvents.booksLoaded, (state, { books }) => ({
    ...state, books, loading: false,
  }))
  .on(BooksApiEvents.booksLoadFailed, (state, { message }) => ({
    ...state, loading: false, error: message,
  }))
  .on(BooksPageEvents.bookSelected, (state, { id }) => ({
    ...state, selectedId: id,
  }))
  .extraViews(({ books, selectedId }, view) => ({
    selectedBook: view(books, selectedId, (books, id) =>
      books.find((book) => book.id === id) ?? null,
    ),
  }));
```

The definition exposes `views`, `provide()`, and `test`. `views.root` selects
all feature state. Each own enumerable property in `initialState` gets a view
with the same name, such as `views.books` and `views.loading`. State fields
should be initialized explicitly.

The `extraViews` callback receives the generated views and a `view` builder
that aliases NgRx's `createSelector`. Its inputs are views; its final callback
receives their values. `selectedBook` reuses its cached result when only
`loading` or `error` changes. Input comparisons use NgRx's default `===`
comparison, so updates must remain immutable.

Each chained call returns a new definition. `.on()` appends a handler and
accepts multiple event creators before the handler. `.extraViews()` runs its
callback once, can compose previously added views, and rejects duplicate
names. `root` is reserved. Existing definitions and view identities are
preserved when a chain is extended.

## Defining effects

The page's `entered` event also triggers an HTTP request. The effect emits a
success or failure event, and the state handlers above react to the result.

```ts
// books.effects.ts
import { inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Actions, ofType } from "@ngrx/effects";
import { sideEffect } from "@ngrx-sugar/store";
import { catchError, exhaustMap, map, of } from "rxjs";
import { BooksApiEvents, BooksPageEvents, type Book } from "./books.events";

export const loadBooks = sideEffect(
  (events$ = inject(Actions), http = inject(HttpClient)) =>
    events$.pipe(
      ofType(BooksPageEvents.entered),
      exhaustMap(() =>
        http.get<Book[]>("/api/books").pipe(
          map((books) => BooksApiEvents.booksLoaded({ books })),
          catchError(() =>
            of(BooksApiEvents.booksLoadFailed({
              message: "Books could not be loaded.",
            })),
          ),
        ),
      ),
    ),
);
```

The example assumes `/api/books` returns a JSON array of books. `exhaustMap`
ignores repeated page-entry events while a request is pending. Handling errors
inside the request keeps the effect listening for future events.

`sideEffect()` creates a callable functional effect. Emitted events are
published automatically; calling `.publish()` inside this pipeline is
unnecessary. `{ dispatch: false }` supports effects that do not emit events.
Effects remain callable with explicit dependencies in tests.

## Consuming events and views

Components read views and publish events describing interactions:

```ts
// books-page.component.ts
import { Component, type OnInit } from "@angular/core";
import { BooksPageEvents } from "./books.events";
import { booksState } from "./books.state";

@Component({
  selector: "app-books-page",
  template: `
    @if (loading()) { <p>Loading books…</p> }
    @if (error(); as message) { <p>{{ message }}</p> }
    @for (book of books(); track book.id) {
      <button (click)="selectBook(book.id)">{{ book.title }}</button>
    }
    @if (selectedBook(); as book) {
      <h2>Selected: {{ book.title }}</h2>
    }
  `,
})
export class BooksPageComponent implements OnInit {
  readonly books = booksState.views.books.signal();
  readonly loading = booksState.views.loading.signal();
  readonly error = booksState.views.error.signal();
  readonly selectedBook = booksState.views.selectedBook.signal();

  ngOnInit() {
    BooksPageEvents.entered.publish();
  }

  selectBook(id: string) {
    BooksPageEvents.bookSelected.publish({ id });
  }
}
```

Every view, including `root` and extra views, has `.signal(options?)` and
`.observable()` methods. For RxJS composition, a component field can use
`readonly books$ = booksState.views.books.observable()` instead.

Both methods require an injection context, such as a component field
initializer, and resolve that injector's Store. Observable views must be
created before entering asynchronous callbacks; subscriptions may run later.
Views also remain callable memoized selectors with their projector and cache
methods.

`.publish()` accepts the same typed arguments as creating an event. It can run
in lifecycle hooks, event handlers, and asynchronous callbacks after
`provideStoreSugar()` initializes. No injected publishing service is needed.

## Providing the Store and state

The application registers the root Store, feature state, and effect together:

```ts
// app.config.ts
import { type ApplicationConfig } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { provideStoreSugar } from "@ngrx-sugar/store";
import { booksState } from "./books.state";
import { loadBooks } from "./books.effects";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideStoreSugar({ devtools: { name: "Books" } }),
    booksState.effects([loadBooks]).provide(),
  ],
};
```

`.effects()` returns a new definition containing the registered effects while
preserving the views used by the component. `.provide()` registers that
feature and its effects. Feature providers can also belong to a route.
Standalone effects can be registered with `loadBooks.provide()`; an effect
should be registered only once.

`.effects()` accepts effect classes, named functional-effect records,
individual functional effects, or arrays combining these forms, including
readonly arrays. Named records preserve descriptive effect keys; individual
functions use the key `effect`.

When state and effect modules import each other, view access must be deferred
until the functional effect runs. Separating shared definitions into another
module avoids that circular dependency.

`provideStoreSugar()` creates an empty NgRx root Store, enables Redux DevTools
in Angular development mode, and enables event creator `.publish()` methods.
It replaces separate `provideStore()` and `provideStoreDevtools()` calls and
belongs in the application shell. Features use `.provide()` or `provideState()`.

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
import { booksState } from "./books.state";
import { BooksApiEvents, BooksPageEvents } from "./books.events";

it("selects a book after it is loaded", () => {
  const book = { id: "42", title: "The Hobbit" };
  const loaded = booksState.test.getNextState(
    undefined,
    BooksApiEvents.booksLoaded({ books: [book] }),
  );
  const selected = booksState.test.getNextState(
    loaded,
    BooksPageEvents.bookSelected({ id: book.id }),
  );

  expect(selected.selectedId).toBe(book.id);
  expect(booksState.views.selectedBook.projector(
    selected.books, selected.selectedId,
  )).toEqual(book);
});
```

Component tests that call `.publish()` can register `provideStoreSugar({ devtools:
false })` before `provideMockStore(...)` in TestBed providers. The mock then replaces
the injected Store. TestBed initialization runs the publishing initializer, and
injector teardown clears registration between tests.

## Developing

From the project root, `npm install` installs workspace dependencies and `npm test --workspace @ngrx-sugar/store` builds the package, checks test types, and runs the utility tests. `npm pack --workspace @ngrx-sugar/store` produces an installable archive.
