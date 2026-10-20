import { EMPTY, of, Subject, tap } from "rxjs";
import { task } from "../../../../ngrx/src/tasks";
const event = Object.assign(() => ({ type: "entered" }), { type: "entered" });
const options = { dispatch: false } as const;
const source = () => of(true);
task((on) => ({
  boolean: on(() => of(true)),
  void: on(() => of(undefined)),
  object: on(() => of({ books: [] })),
  mixed: on(() => of(Math.random() ? { type: "ok" } : false)),
  wrongType: on(() => of({ type: 42 })),
  eventCreator: on(() => of(event)),
  eventDriven: on(event, () => of(true)),
  dispatchTrue: on(source, { dispatch: true }),
  subject: on(() => new Subject<boolean>()),
  valid: on(() => of({ type: "ok" })),
  empty: on(() => EMPTY),
  disabled: on(source, { dispatch: false }),
  optionsVariable: on(source, options),
  eventDisabled: on(event, () => of(true), options),
  tap: on(event, (pipe) => pipe(tap(() => {})), options),
  any: on(() => of(null as any)),
  unknown: on(() => of(null as unknown)),
}));
task((subscribe) => ({ renamed: subscribe(source) }));
const on = (...args: unknown[]) => args;
on(source);
