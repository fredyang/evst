# Requiring event-driven tasks

Tasks normally handle one or more events. A task with an observable source
instead starts as soon as its effects are provided, which can make lifecycle
and error handling less visible.

```ts
// Reported
const appTasks = tasks((on) => ({
  connection: on(() => socket.connected$),
}));
```

An eventless task can be used when that lifecycle is intentional. The
suppression must state why it is appropriate.

```ts
const booksTasks = tasks((on) => ({
  // eslint-disable-next-line evst/require-task-event -- Validates the required storage capability when the Books feature initializes.
  checkStorageSupport: on(() => storage.supported(), { dispatch: false }),
}));
```

`require-task-event-suppression-reason` enforces the required text after `--`.
The rule recognizes source overloads within `tasks((on) => ...)`; it does not
require type information.
