import { emptyProps, events, props, state, task, view } from "@evst/rtk";

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
export const booksState = state("books", { titles: [] as string[] })
  .extraViews(({ titles }) => ({
    total: view(titles, (titles) => titles.length),
    unused: view(titles, (titles) => titles.join(", ")),
  }))
  .handle((on) => ({
    loaded: on(fromBooksApi.loaded, (current, { titles }) => {
      current.titles = titles;
    }),
  }));
export const booksViews = booksState.views;
export const booksTasks = task.handle((on) => ({
  load: on(fromBooksPage.entered, async () => {
    return fromBooksApi.loaded({ titles: ["The Hobbit"] });
  }),
}));
