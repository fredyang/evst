# Preventing duplicate event handlers

One State definition should handle each event once. Multiple handlers for the
same event make the resulting state transition harder to understand.

```ts
// Reported
const booksState = state("books", initialState)
  .on(BooksEvents.loaded, (state) => ({ ...state, loading: false }))
  .on(BooksEvents.loaded, (state) => ({ ...state, loaded: true }));

// Accepted
const booksState = state("books", initialState).on(
  BooksEvents.loaded,
  (state) => ({ ...state, loading: false, loaded: true }),
);
```

The rule checks fluent chains that begin with `state(...)`. It compares event
expressions syntactically and does not require type information.
