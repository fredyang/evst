# Preventing multiple sequential event publications

Publishing multiple events to trigger work makes the publisher orchestrate
application logic and turns events into commands. In the event-driven model, a
publisher reports one fact - something that happened - with one event. State and
Task handlers interested in that fact react independently.

## Failing example

The page-entry handler publishes two commands to coordinate loading and
tracking. The second publication is reported.

```ts
// ❌ don't do this
function ngOnInit() {
  fromBooksPage.loadRequested.publish();
  fromBooksPage.visitTrackingRequested.publish();
}

// ✅ do this
function ngOnInit() {
  fromBooksPage.entered.publish();
}
```

## Passing example

The page-entry handler publishes one event describing what happened. Loading and
tracking Tasks can react to that event independently.

```ts
// ✅ do this
function ngOnInit() {
  fromBooksPage.entered.publish();
}
```

## Analysis scope

The rule checks each function separately and reports every `.publish()` call
after the first. Nested functions are checked separately. The rule recognizes
non-computed `.publish()` calls and does not need type information, so it can be
used with a standard TypeScript ESLint configuration.
