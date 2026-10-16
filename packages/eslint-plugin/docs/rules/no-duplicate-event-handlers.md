# Preventing duplicate event handlers

One State definition should handle each event once. Multiple handlers for the
same event make the resulting state transition harder to understand.

```ts
// Reported
const booksState = evst("books", initialState).state((on) => ({
  finishLoading: on(BooksEvents.loaded, (state) => ({
    ...state,
    loading: false,
  })),
  markLoaded: on(BooksEvents.loaded, (state) => ({ ...state, loaded: true })),
}));

// Accepted
const booksState = evst("books", initialState).state((on) => ({
  finishLoading: on(BooksEvents.loaded, (state) => ({
    ...state,
    loading: false,
    loaded: true,
  })),
}));
```

The rule checks fluent chains that begin with `evst(...)`. It compares event
expressions syntactically and does not require type information.
