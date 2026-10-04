# Books examples

The four Books applications have identical UI and behavior. Each can search the
Google Books API, manage a local collection, authenticate a user, and navigate
between collection, search, and detail pages. They differ only in Angular
composition and state-management style.

[`ngrx-books`](examples/projects/ngrx-books) is copied directly from the
[NgRx example application at version 22.0.1](https://github.com/ngrx/platform/tree/22.0.1/projects/example-app).
[`ngrx-books-standalone`](examples/projects/ngrx-books-standalone) is derived
from that application and refactored to use standalone components.
[`evst-books`](examples/projects/evst-books) is derived from the standalone
version and refactored to use EVST. [`svc-books`](examples/projects/svc-books)
is also derived from the standalone version and refactored to use feature
services instead of NgRx.

## Comparing the implementations

| Example                                                            | Angular composition                 | State-management style                         | Consumer interaction                                                       |
| ------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| [`ngrx-books`](examples/projects/ngrx-books)                       | NgModules                           | Standard NgRx Store and class-based Effects    | Components inject `Store`, select Observables, and dispatch Actions.       |
| [`ngrx-books-standalone`](examples/projects/ngrx-books-standalone) | Standalone providers and components | Standard NgRx Store and class-based Effects    | Components still inject `Store`, select Observables, and dispatch Actions. |
| [`evst-books`](examples/projects/evst-books)                       | Standalone providers and components | EVST on top of NgRx Store and Effects          | Components read View Signals and publish events.                           |
| [`svc-books`](examples/projects/svc-books)                         | Standalone providers and components | Feature services with Angular Signals and RxJS | Components call service methods and read service Signals.                  |

## Running an example

All commands run from the repository root after `npm install`:

```sh
npm run serve:ngrx-books
npm run serve:ngrx-books-standalone
npm run serve:evst-books
npm run serve:svc-books
```

The applications use separate ports: 4200, 4201, 4202, and 4203 respectively.

All examples share a browser-restricted Google Books API key for local serving.
If Google Books requests stop working because that key has expired or been
rotated, create a replacement in the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials).
Enable the Books API, restrict the key to the local example origins, and update
[`GOOGLE_BOOKS_API_KEY`](examples/projects/shared/google-books-api-key.ts).

## Exploring module-based NgRx

[`ngrx-books`](examples/projects/ngrx-books) is the original NgRx-style
application. Its [root module](examples/projects/ngrx-books/src/app/app.module.ts)
registers `StoreModule`, `EffectsModule`, router-store, and DevTools. Feature
NgModules register feature reducers and Effects.

Actions are declared with `createActionGroup`, reducers handle Actions with
`createReducer` and `on`, and class-based Effects react to `Actions`. Container
components inject the global Store, call `select(...)`, and call `dispatch(...)`.
For example, the [Find Book page](examples/projects/ngrx-books/src/app/books/containers/find-book-page.component.ts)
selects search state as Observables and dispatches its search Action.

This example is useful as the baseline for the classic NgRx architecture.

## Exploring standalone NgRx

[`ngrx-books-standalone`](examples/projects/ngrx-books-standalone) preserves the
same NgRx state model while replacing NgModules with standalone components and
provider-based application configuration. Its
[application config](examples/projects/ngrx-books-standalone/src/app/app.config.ts)
uses `provideStore`, `provideEffects`, `provideRouterStore`, and
`provideStoreDevtools`.

The Store-facing feature code remains conventional NgRx. The
[Find Book page](examples/projects/ngrx-books-standalone/src/app/books/containers/find-book-page.component.ts)
still injects `Store`, selects Observable values, and dispatches an Action. This
isolates the difference between Angular composition style and state-management
style.

## Exploring EVST

[`evst-books`](examples/projects/evst-books) uses the same NgRx runtime through
EVST's Event, View, State, and Task model. Its
[application config](examples/projects/evst-books/src/app/app.config.ts) calls
`provideEvst(...)` and registers a root bundle.

Provider code is grouped by intent:

- [Events](examples/projects/evst-books/src/app/books/store/books.events.ts)
  name what happened and where it happened.
- [State](examples/projects/evst-books/src/app/books/store/books.state.ts)
  defines state transitions and derived Views.
- [Tasks](examples/projects/evst-books/src/app/books/store/books.tasks.ts)
  perform API and storage work and return outcome events.
- The [bundle](examples/projects/evst-books/src/app/books/store/books.bundle.ts)
  registers the State and Tasks together.

Consumer code does not inject `Store`. The
[Find Book page](examples/projects/evst-books/src/app/books/containers/find-book-page.component.ts)
reads View Signals and publishes `fromFindBookPage.searchQueryChanged`.

## Exploring service-owned state

[`svc-books`](examples/projects/svc-books) removes NgRx entirely. The
[Books service](examples/projects/svc-books/src/app/books/services/books.service.ts)
owns writable Signals, exposes read-only derived Signals with `computed`, and
performs HTTP and storage work through RxJS subscriptions. Components inject the
feature service and invoke direct methods such as `search(query)`.

The [Find Book page](examples/projects/svc-books/src/app/books/containers/find-book-page.component.ts)
shows the resulting component API: it reads service Signals and calls
`booksService.search(query)`. This provides a useful comparison with EVST's
event-driven boundary.

## Choosing an example

The appropriate starting point depends on the architecture under study:

- **Module-based NgRx** shows the established NgRx architecture.
- **Standalone NgRx** shows the same Store model with current Angular provider
  composition.
- **EVST** shows event-driven feature boundaries while retaining NgRx, Effects,
  DevTools, and entity adapters.
- **Service-owned state** provides a comparison with a direct command API built
  from Angular Signals and RxJS.
