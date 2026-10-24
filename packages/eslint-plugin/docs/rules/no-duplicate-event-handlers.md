# Preventing duplicate event handlers

One State definition should handle each event once. Multiple handlers for the
same event make the resulting state transition harder to understand.

## Failing example

Both handlers subscribe to `fromBooksApi.loaded` within the same State definition.
The duplicate subscription is reported.

```ts
const booksState = evst("books", { loading: true, loaded: false }).state(
  (on) => ({
    finishLoading: on(fromBooksApi.loaded, (state) => ({
      ...state,
      loading: false,
    })),
    markLoaded: on(fromBooksApi.loaded, (state) => ({
      ...state,
      loaded: true,
    })),
  }),
);
```

## Passing example

Combining both changes into one handler gives the event one state transition.

```ts
const booksState = evst("books", { loading: true, loaded: false }).state(
  (on) => ({
    finishLoading: on(fromBooksApi.loaded, (state) => ({
      ...state,
      loading: false,
      loaded: true,
    })),
  }),
);
```

## Analysis scope

The rule checks fluent chains that begin with `evst(...)`. It compares event
expressions syntactically and does not require type information.
