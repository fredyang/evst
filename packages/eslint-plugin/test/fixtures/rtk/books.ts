import { emptyProps, events, props, state, taskOn, view } from "@evst/rtk";
import { of } from "rxjs";

export const fromBooksPage = events("Books Page", {
  entered: emptyProps(),
  unused: emptyProps(),
});
export const fromBooksApi = events("Books API", {
  loaded: props<{ titles: string[] }>(),
});
export const fromSelectionPage = events("Selection Page", {
  added: emptyProps(),
  removed: emptyProps(),
  checked: emptyProps(),
});

// An unrelated RxJS subscription must not count as a State event subscription.
of(null).subscribe(() => {
  const on = (_event: unknown, _handler: () => void) => {};
  on(fromSelectionPage.checked, () => {});
});
export const booksState = state("books", { titles: [] as string[] })
  .extraViews(({ titles }) => ({
    total: view(titles, (titles) => titles.length),
    taskOnly: view(titles, (titles) => titles.length > 0),
    unused: view(titles, (titles) => titles.join(", ")),
  }))
  .stateOn((on) => ({
    loaded: on(fromBooksApi.loaded, (current, { titles }) => {
      current.titles = titles;
    }),
  }))
  .taskOn((on, views) => ({
    inspect: on(fromBooksApi.loaded, () => {
      views.taskOnly.snapshot;
    }),
  }));
export const booksViews = booksState.views;
export const booksTasks = taskOn((on) => ({
  load: on(fromBooksPage.entered, async () => {
    return fromBooksApi.loaded({ titles: ["The Hobbit"] });
  }),
}));
