# Requiring safe Task output dispatch

Tasks dispatch every value emitted by their output observable unless
`{ dispatch: false }` is provided.

With type-aware linting enabled, `evst/require-task-dispatch-false` reports an
error when `{ dispatch: false }` is missing and either of these cases applies:

1. The Task emits a non-event value, such as `null`, `boolean`, or `void`.
2. The Task emits an event type that the same Task subscribes to.

The following examples show both errors and their fixes.

## Fixing non-event output

### Failing example

This Task emits `null`. With dispatch enabled by default, NgRx attempts to
dispatch `null`, which is not an event with a required string `type` property.

```ts
const fromCounterWidget = events("Counter Widget", {
  backupRequested: emptyProps(),
});

const backupTasks = task((on) => ({
  // ESLint error: this Task emits a non-event value.
  backup: on(fromCounterWidget.backupRequested, (pipe) =>
    pipe(map(() => null)),
  ),
}));
```

### Passing example

Adding `{ dispatch: false }` prevents NgRx from dispatching the output. The Task
still subscribes to the event and runs its pipeline.

```ts
const backupTasks = task((on) => ({
  backup: on(
    fromCounterWidget.backupRequested,
    (pipe) => pipe(map(() => null)),
    { dispatch: false },
  ),
}));
```

This option suits side effects whose output is not needed as an event, such as a
storage operation returning `Observable<null>`.

## Fixing subscribed event output

### Failing example

`tap()` runs the logging side effect and passes the original event downstream
unchanged. NgRx then dispatches that event again. Because this Task subscribes
to the same event, it triggers itself repeatedly.

```ts
const analyticsTasks = task((on) => ({
  // ESLint error: this Task re-emits a subscribed event type.
  track: on(fromCounterWidget.backupRequested, (pipe) =>
    pipe(tap((event) => console.log(event.type))),
  ),
}));
```

### Passing example

Adding `{ dispatch: false }` keeps the logging side effect and prevents the
output event from being dispatched again.

```ts
const analyticsTasks = task((on) => ({
  track: on(
    fromCounterWidget.backupRequested,
    (pipe) => pipe(tap((event) => console.log(event.type))),
    { dispatch: false },
  ),
}));
```

## Returning an outcome event instead

For either error, another valid fix is to return an outcome event with a different
type from every event the Task subscribes to. Dispatch remains enabled when the
output should trigger state changes or other Tasks.

```ts
const fromCounterApi = events("Counter API", {
  backupSucceeded: emptyProps(),
});

const backupTasks = task((on) => ({
  backup: on(fromCounterWidget.backupRequested, (pipe) =>
    pipe(map(() => fromCounterApi.backupSucceeded())),
  ),
}));
```

Mapping to a new object with the same subscribed event type still reports a
potential cycle. Event types determine subscriptions, rather than object identity.
No automatic fix is provided because either returning a different outcome event
or disabling dispatch may be appropriate.

## Enabling type analysis

The rule is enabled as an error in the `evst-ngrx` preset. A TypeScript project
must also be configured in ESLint parser options:

```js
languageOptions: {
  parser: tseslint.parser,
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
},
```

The configured project must include the linted files. Without type information,
the rule performs no checks. Both `task(...)` and `.task(...)` are supported,
including renamed builder parameters, individual event creators, event groups,
and multiple subscriptions.

## Analysis limits

`EMPTY` and options with a statically known `dispatch: false` are accepted,
including options stored in a variable. Unions containing known invalid outputs
or subscribed event types are reported. Outputs typed as `any`, `unknown`, or
unconstrained type parameters are not diagnosed.

Cycle detection compares string literal event types. Broad `string` types do not
establish a known cycle. A reported overlap identifies a potential cycle; the
rule does not prove that a particular runtime path loops indefinitely. Cycles
spanning several Tasks are outside its scope.
