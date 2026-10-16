import { events, evst, task, view } from "@evst/ngrx-store";
import { emptyProps } from "@ngrx/store";
import { map } from "rxjs";

const fromCounterPage = events("Counter Page", { clicked: emptyProps() });
const fromCounterTask = events("Counter Task", { counted: emptyProps() });
const counter = evst("counter", { count: 0 })
  .view(({ count }) => ({
    taskOnly: view(count, (count) => count * 2),
    unused: view(count, (count) => count > 0),
  }))
  .state((on) => ({
    count: on(fromCounterTask.counted, (current) => ({
      count: current.count + 1,
    })),
  }))
  .task((on, views) => ({
    count: on(fromCounterPage.clicked, (pipe) => {
      views.taskOnly.observable();
      return pipe(map(() => fromCounterTask.counted()));
    }),
  }))
  .view(({ taskOnly }) => ({ later: view(taskOnly, (count) => String(count)) }))
  .task((on, { later }) => ({
    laterTask: on(fromCounterPage.clicked, (pipe) => {
      later.observable();
      return pipe(map(() => fromCounterTask.counted()));
    }),
  }));
export const counterViews = counter.views;
export const standalone = task((on) => ({
  observe: on(fromCounterTask.counted, (pipe) => pipe(), { dispatch: false }),
}));
fromCounterPage.clicked.publish();
