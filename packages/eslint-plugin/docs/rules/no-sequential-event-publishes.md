# Preventing sequential event publications

An executable boundary represents one command. Publishing multiple events from
one handler or callback creates a command sequence through events.

```ts
// Reported
saveRequested.publish();
reloadRequested.publish();

// Accepted
saveRequested.publish();
```

Separate functions and callbacks are separate executable boundaries. A flow that
must perform several operations can be represented by one event and handled by a
service command.

```ts
saveAndReloadRequested.publish();
```

The rule recognizes non-computed `.publish()` calls. It does not need type
information, so it can be used with a standard TypeScript ESLint configuration.
