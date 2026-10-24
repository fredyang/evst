# Requiring event-driven tasks

Tasks normally handle one or more events. A task with an observable source
instead starts as soon as its effects are provided, which can make lifecycle
and error handling less visible.

## Failing example

The source overload subscribes immediately when the Task is provided. No event
controls when it starts, so the Task is reported.

```ts
const appTasks = task((on) => ({
  connection: on(() => socket.connected$, { dispatch: false }),
}));
```

## Passing example

Subscribing to an event makes the start of the operation explicit. Dispatch is
disabled because this Task only logs connection changes.

```ts
const fromApp = events("App", { entered: emptyProps() });

const appTasks = task((on) => ({
  connection: on(
    fromApp.entered,
    (pipe) =>
      pipe(
        switchMap(() => socket.connected$),
        tap((connected) => console.log(connected)),
      ),
    { dispatch: false },
  ),
}));
```

## Documenting an intentional startup Task

An eventless Task can be used when its startup lifecycle is intentional. Its
suppression must explain why it is appropriate.

### Failing example

The suppression has no reason and is reported by
`evst/require-task-event-suppression-reason`.

```ts
const booksTasks = task((on) => ({
  // eslint-disable-next-line evst/require-task-event
  checkStorageSupport: on(() => storage.supported(), { dispatch: false }),
}));
```

### Passing example

Adding a specific explanation after `--` documents the exception.

```ts
const booksTasks = task((on) => ({
  // eslint-disable-next-line evst/require-task-event -- Validates storage capability when the Books feature initializes.
  checkStorageSupport: on(() => storage.supported(), { dispatch: false }),
}));
```

## Analysis scope

`require-task-event-suppression-reason` enforces the required text after `--`.
The rule recognizes source overloads within `task((on) => ...)` and
`.task((on, views) => ...)`; it does not require type information.
