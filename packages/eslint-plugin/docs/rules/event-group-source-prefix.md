# Requiring source-oriented event-group names

Event groups created with `events()` must use a `fromXxx` variable name. The name makes the authoritative source of the events visible at each publication site.

## Invalid

```ts
const booksEvents = events("Books API", {
  searchSucceeded: props<{ books: Book[] }>(),
});
```

## Valid

```ts
const fromBooksApi = events("Books API", {
  searchSucceeded: props<{ books: Book[] }>(),
});
```

The rule is intentionally a naming convention. It cannot prove that an event is published only by its source; `event-publisher-ownership` checks for multiple publication sites.
