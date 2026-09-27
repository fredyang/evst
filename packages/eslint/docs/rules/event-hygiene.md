# Enforcing event hygiene

The rule checks string literals passed to `createAction` and literal sources passed to `events(source, events)`.

`createAction` types must contain a nonempty `[Source]` prefix and event text. `events()` sources must be nonempty.

```ts
// Accepted
createAction("[Books Page] Load Books");
events("User", { idle: props(), idleTimedOut: props() });

// Reported
createAction("Books loaded");
events("", { idle: props() });
```

Event naming is a domain decision, not a grammatical rule. Dynamic values and aliased calls are not checked. No type information is required.
