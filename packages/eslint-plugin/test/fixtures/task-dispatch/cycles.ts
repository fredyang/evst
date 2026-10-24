import { EMPTY, filter, map, of, tap } from "rxjs";
import { task } from "../../../../ngrx/src/tasks";
import { evst } from "../../../../ngrx/src/state";
import { events } from "../../../../ngrx/src/events";
import { emptyProps } from "@ngrx/store";

const fromWidget = events("Widget", {
  entered: emptyProps(),
  clicked: emptyProps(),
});
const fromApi = events("API", { loaded: emptyProps() });
const disabled = { dispatch: false } as const;

task((on) => ({
  tap: on(fromWidget.entered, (pipe) => pipe(tap(() => {}))), // cyclicEventOutput
  passthrough: on(fromWidget.entered, (pipe) => pipe()), // cyclicEventOutput
  filtered: on(fromWidget.entered, (pipe) => pipe(filter(() => true))), // cyclicEventOutput
  group: on(fromWidget, (pipe) => pipe(tap(() => {}))), // cyclicEventOutput
  multiple: on(fromWidget.entered, fromApi.loaded, () => of(fromApi.loaded())), // cyclicEventOutput
  mixed: on(fromWidget.entered, () =>
    of(Math.random() ? fromApi.loaded() : fromWidget.entered()),
  ), // cyclicEventOutput
  explicit: on(fromWidget.entered, (pipe) => pipe(), { dispatch: true }), // cyclicEventOutput
  conditionalObservable: on(fromWidget.entered, () =>
    Math.random() ? of(fromApi.loaded()) : of(fromWidget.entered()),
  ), // cyclicEventOutput
  mapped: on(fromWidget.entered, (pipe) => pipe(map(() => fromApi.loaded()))),
  groupOutcome: on(fromWidget, () => of(fromApi.loaded())),
  disabled: on(fromWidget.entered, (pipe) => pipe(), disabled),
  inlineDisabled: on(fromWidget, (pipe) => pipe(), { dispatch: false }),
  empty: on(fromWidget.entered, () => EMPTY),
  noSubscription: on(() => of(fromWidget.entered())),
  broad: on(fromWidget.entered, () =>
    of({ type: "unknown" } as { type: string }),
  ),
}));
task((subscribe) => ({
  renamed: subscribe(fromWidget.entered, (pipe) => pipe()),
})); // cyclicEventOutput

evst("counter", { count: 0 }).task((on) => ({
  attached: on(fromWidget, (pipe) => pipe()), // cyclicEventOutput
}));
