# Detecting unpublished events

An event declaration without a publication cannot affect application state or
start a task. `no-unpublished-events` reports those declarations.

```ts
const BooksEvents = events("Books", {
  loaded: emptyProps(), // Reported when no publication exists.
});
```

The rule recognizes direct publications and events emitted from EVST tasks.

```ts
BooksEvents.loaded.publish();

const booksTasks = task((on) => ({
  load: on(BooksPageEvents.entered, (pipe) =>
    pipe(map(() => BooksEvents.loaded())),
  ),
}));
```

Conditional publication recognizes both possible event creators, including
nested conditions and parenthesized expressions:

```ts
(saved ? fromBooksPage.removed : fromBooksPage.added).publish({ book });
```

References used only as the condition are not counted as publications.

The rule requires type-aware linting with `parserOptions.project` or
`projectService`. Imported aliases are resolved throughout the TypeScript
program.
