import { generateMockBook } from "../models/book";
import {
  fromBookExistsGuard,
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
} from "./books.events";
import { booksState } from "./books.state";

describe("booksState", () => {
  const book = generateMockBook();
  const otherBook = { ...book, id: "2" };

  it("initializes the complete feature state", () => {
    expect(booksState.reducer(undefined, { type: "unknown" })).toEqual({
      books: { ids: [], entities: {}, selectedBookId: null },
      search: { ids: [], loading: false, error: "", query: "" },
      collection: { loaded: false, loading: false, ids: [] },
    });
  });

  it("adds search results and records the active query", () => {
    const searching = booksState.reducer(
      undefined,
      fromFindBookPage.searchQueryChanged({ query: "ngrx" }),
    );
    const result = booksState.reducer(
      searching,
      fromBooksApi.searchSuccess({ books: [book, otherBook] }),
    );

    expect(result.search).toEqual({
      ids: [book.id, otherBook.id],
      loading: false,
      error: "",
      query: "ngrx",
    });
    expect(result.books.entities).toMatchObject({
      [book.id]: book,
      [otherBook.id]: otherBook,
    });
  });

  it("clears search results for an empty query and records failures", () => {
    const cleared = booksState.reducer(
      undefined,
      fromFindBookPage.searchQueryChanged({ query: "" }),
    );
    const failed = booksState.reducer(
      cleared,
      fromBooksApi.searchFailure({ errorMsg: "Unavailable" }),
    );

    expect(cleared.search).toEqual({
      ids: [],
      loading: false,
      error: "",
      query: "",
    });
    expect(failed.search.error).toBe("Unavailable");
  });

  it("loads the collection and preserves existing entities", () => {
    const withBook = booksState.reducer(
      undefined,
      fromBookExistsGuard.loadBook({ book }),
    );
    const result = booksState.reducer(
      withBook,
      fromCollectionApi.loadBooksSuccess({ books: [book, otherBook] }),
    );

    expect(result.collection).toEqual({
      loaded: true,
      loading: false,
      ids: [book.id, otherBook.id],
    });
    expect(result.books.entities[book.id]).toBe(book);
  });

  it("tracks collection loading and optimistic collection changes", () => {
    const loading = booksState.reducer(undefined, fromCollectionPage.enter());
    const added = booksState.reducer(
      loading,
      fromSelectedBookPage.addBook({ book }),
    );
    const removed = booksState.reducer(
      added,
      fromSelectedBookPage.removeBook({ book }),
    );

    expect(loading.collection.loading).toBe(true);
    expect(added.collection.ids).toEqual([book.id]);
    expect(removed.collection.ids).toEqual([]);
  });

  it("selects a book without duplicating an already loaded entity", () => {
    const loaded = booksState.reducer(
      undefined,
      fromBookExistsGuard.loadBook({ book }),
    );
    const duplicate = booksState.reducer(
      loaded,
      fromBookExistsGuard.loadBook({ book }),
    );
    const selected = booksState.reducer(
      duplicate,
      fromViewBookPage.selectBook({ id: book.id }),
    );

    expect(duplicate).toBe(loaded);
    expect(selected.books.selectedBookId).toBe(book.id);
  });
});
