# Preventing sequential event publications

An executable boundary represents one command. Publishing multiple events from
one handler or callback creates a command sequence through events.

## Failing example

The same handler publishes two events to coordinate a save and reload sequence.
The second publication in that boundary is reported.

```ts
function saveAndReload() {
  fromBooksPage.saveRequested.publish();
  fromBooksPage.reloadRequested.publish();
}
```

## Passing example

One event represents the requested operation. Its Task can delegate the save and
reload sequence to a service command.

```ts
const fromBooksPage = events("Books Page", {
  saveAndReloadRequested: emptyProps(),
});

function saveAndReload() {
  fromBooksPage.saveAndReloadRequested.publish();
}
```

Separate functions and callbacks are separate executable boundaries.

## Analysis scope

The rule recognizes non-computed `.publish()` calls. It does not need type
information, so it can be used with a standard TypeScript ESLint configuration.
