# Detecting unpublished events

An event declaration without a publication cannot affect application state or
start a task. `no-unpublished-events` reports those declarations.

## Failing example

`entered` is declared but never published or returned by a Task. The declaration
is reported.

```ts
const fromBooksPage = events("Books Page", {
  entered: emptyProps(),
});
```

## Passing example

Publishing the event from the page entry handler gives it a publishing boundary.
Removing an unused declaration is also a valid fix when the event is unnecessary.

```ts
const fromBooksPage = events("Books Page", {
  entered: emptyProps(),
});

function enterBooksPage() {
  fromBooksPage.entered.publish();
}
```

Events returned by Tasks also count as publications:

```ts
const booksTasks = task((on) => ({
  markLoaded: on(fromBooksPage.entered, (pipe) =>
    pipe(map(() => fromBooksApi.loaded())),
  ),
}));
```

## Analysis scope

Conditional publication recognizes both possible event creators, including
nested conditions and parenthesized expressions:

```ts
(saved ? fromBooksPage.removed : fromBooksPage.added).publish({ book });
```

References used only as the condition are not counted as publications.

The rule requires type-aware linting with `parserOptions.project` or
`projectService`. Imported aliases are resolved throughout the TypeScript
program.
