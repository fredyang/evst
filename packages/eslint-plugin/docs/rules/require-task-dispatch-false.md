# Requiring dispatch: false for non-event Tasks

`evst/require-task-dispatch-false` reports NgRx Tasks whose observable output
contains a value without a required string `type` property. Dispatch is enabled
by default, so boolean, void, and other non-event outputs require
`{ dispatch: false }`.

```ts
const checks = task((on) => ({
  storage: on(() => storage.supported(), { dispatch: false }),
}));
```

The rule is enabled as an error in the `evst-ngrx` preset. Analysis
requires a TypeScript project in ESLint parser options. Without type information,
the rule performs no checks. It recognizes the first callback parameter of
`task(...)` and `.task(...)`, including renamed builder parameters.

Valid event outputs and `EMPTY` are accepted. Unions containing known invalid
outputs are reported. Outputs typed as `any`, `unknown`, or unconstrained type
parameters are not diagnosed. Options with a statically known `dispatch: false`
are accepted, including options stored in a variable.

No automatic fix is provided: a task may need to map its output to an outcome
event instead of disabling dispatch. This rule checks output shape; it does not
detect cycles between valid events.
