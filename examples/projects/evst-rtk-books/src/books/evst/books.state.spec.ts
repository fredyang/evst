import { expect, it } from "vitest";
import { booksState, booksViews, initialState } from "./books.state";
import {
  fromBooksApi,
  fromCollectionApi,
  fromFindBookPage,
  fromViewBookPage,
} from "./books.events";
import { fromAuth } from "../../auth/evst/auth.evst";
import type { Book } from "../model/book";

const book: Book = {
  id: "one",
  title: "Book",
  authors: [],
  description: "",
  cover: "",
};

it("ignores stale search outcomes and derives results for the current query", () => {
  const searching = booksState.reducer(
    initialState,
    fromFindBookPage.searchQueryChanged({ query: "new" }),
  );
  expect(
    booksState.reducer(
      searching,
      fromBooksApi.searchSuccess({ query: "old", books: [book] }),
    ),
  ).toBe(searching);
  expect(
    booksState.reducer(
      searching,
      fromBooksApi.searchFailure({ query: "old", error: "Failed" }),
    ),
  ).toBe(searching);
  const loaded = booksState.reducer(
    searching,
    fromBooksApi.searchSuccess({ query: "new", books: [book] }),
  );
  expect(booksViews.results({ books: loaded })).toEqual([book]);
  expect(loaded.search.loading).toBe(false);
});

it("stores other detail responses without changing the current selection", () => {
  const selected = booksState.reducer(
    initialState,
    fromViewBookPage.selected({ id: "two" }),
  );
  const loaded = booksState.reducer(
    selected,
    fromBooksApi.loadBookSuccess({ book }),
  );
  expect(loaded.books.entities.one).toEqual(book);
  expect(loaded.detail).toEqual(selected.detail);
  expect(booksViews.selectedBook({ books: loaded })).toBeUndefined();
  expect(
    booksState.reducer(
      loaded,
      fromBooksApi.loadBookFailure({ id: "one", error: "Failed" }),
    ),
  ).toBe(loaded);
});

it("derives saved books and resets all Books state on logout", () => {
  const loaded = booksState.reducer(
    initialState,
    fromCollectionApi.loadBooksSuccess({ books: [book] }),
  );
  expect(booksViews.collectionBooks({ books: loaded })).toEqual([book]);
  expect(booksState.reducer(loaded, fromAuth.logout())).toEqual(initialState);
});
