import { events, state, taskOn, view } from "@evst/ngrx";
import { emptyProps } from "@ngrx/store";
import { map } from "rxjs";

const fromCounterPage = events("Counter Page", { clicked: emptyProps() });
const fromCounterTask = events("Counter Task", { counted: emptyProps() });
const counter = state("counter", { count: 0 })
  .extraViews(({ count }) => ({
    taskOnly: view(count, (count) => count * 2),
    unused: view(count, (count) => count > 0),
  }))
  .stateOn((on) => ({
    count: on(fromCounterTask.counted, (current) => ({
      count: current.count + 1,
    })),
  }))
  .taskOn((on, views) => ({
    count: on(fromCounterPage.clicked, (pipe) => {
      views.taskOnly.observable();
      return pipe(map(() => fromCounterTask.counted()));
    }),
  }));
export const counterViews = counter.views;
export const standalone = taskOn((on) => ({
  observe: on(fromCounterTask.counted, (pipe) => pipe(), { dispatch: false }),
}));
fromCounterPage.clicked.publish();
