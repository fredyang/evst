# Detecting unsubscribed events

Published events without a state handler or task listener have no observable
effect. `no-unsubscribed-events` reports those declarations.

```ts
const BooksEvents = events("Books", {
  loaded: emptyProps(), // Reported when no subscription exists.
});
```

State handlers and event-driven EVST tasks are subscriptions.

```ts
const booksState = state("books", initialState).handle((on) => ({
  retainLoadedState: on(BooksEvents.loaded, (current) => current),
}));

const booksTasks = task.handle((on) => ({
  refresh: on(BooksEvents.loaded, (pipe) =>
    pipe(map(() => RefreshEvents.run())),
  ),
}));
```

The rule requires type-aware linting with `parserOptions.project` or
`projectService`. Imported aliases are resolved throughout the TypeScript
program.
