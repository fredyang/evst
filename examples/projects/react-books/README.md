# React Books

React Books uses Material UI and `@evst/react` for the book search and collection
flows from EVST Books.

## Signing in and navigating

The demo accepts usernames `ngrx` and `test`; the password is not validated,
matching EVST Books. Authentication is simulated and resets on reload.
Invalid usernames display a login error.

The toolbar opens a sidebar with My Collection, Browse Books, and Sign Out.
Signing out opens a confirmation dialog. Five minutes without browser activity
automatically signs out the user. Activity resets the timeout; leaving the
authenticated session removes its listeners and timer.

The default route redirects to `/books`. Protected Books routes redirect signed-out
visitors to `/login`. The Books module is loaded only after authentication:

- `/books`: saved collection
- `/books/find`: Google Books search
- `/books/:id`: book details and collection controls
- `/login`: demo login

Unknown routes show a not-found page. Route changes update the document title.

## Registering features

`src/store.ts` registers only auth and core state plus auth tasks at startup.
The lazy Books loader calls `provideBooks()`, which registers Books state and tasks
through `store.provide()` before rendering its pages. Registration is idempotent,
and Books state persists across navigation and sign-out. Collection data remains
in localStorage, as in EVST Books; it is not partitioned by demo username.

## Running the example

From the repository root:

```sh
npm run serve:react-books
npm run build:react-books
npm run test:react-books
```

Search and direct book-detail routes call the Google Books API using the same
shared, browser-restricted API key as `evst-books`. API quota and HTTP failures
appear as errors in the interface. There is no mock-catalog fallback.

## Following state changes

- `src/books/components/` contains the search, detail, collection, and reusable
  book-grid components.
- `src/auth/evst/` and `src/core/evst/` contain auth and app-shell events, state,
  and tasks. `src/books/evst/` contains books events, state, and tasks. EVST files
  use feature-specific names such as `auth.state.ts` and `books.tasks.ts`.
- `src/books/model/` contains the `Book` type and runtime validation.
- `src/services/` contains the fetch and storage boundaries. Tests inject
  replacements to exercise cancellation and errors without network access.

The search input uses a standalone debounce utility to wait 300 ms before
publishing a query event. Local input state updates immediately; clearing the
input publishes immediately, and unmounting cancels pending publication.
Tasks start immediately on published events. A standalone `latest()` utility
wraps search and detail handlers, discarding superseded results even for repeated
identical queries. Each handler has independent request tracking.
In-flight requests continue, but superseded outcomes are ignored. Empty queries
clear results; stale outcomes cannot replace a newer query. Detail routes fetch
uncached books by ID. Collection changes update the UI optimistically, then
success or failure events confirm the write or roll back the change.

Full book records are saved under `evst-react-books.collection.v2` in localStorage,
so collections survive a reload without repeating searches. The earlier demo's
ID-only collection is not imported. Demo authentication is not a server security boundary.
