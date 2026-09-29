import { generateMockBook } from "../models/book";
import { fromAuth } from "@example-app/auth/store/auth.events";
import {
  fromBookExistsGuard,
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
} from "./books.events";
import { booksState, booksViews } from "./books.state";

describe("booksState", () => {
  const book = generateMockBook();
  const otherBook = { ...book, id: "2" };
  const bookReducer = booksState.reducer;

  it("initializes the complete feature state", () => {
    expect(bookReducer(undefined, { type: "unknown" })).toEqual({
      books: { ids: [], entities: {}, selectedBookId: null },
      search: { ids: [], loading: false, error: "", query: "" },
      collection: { loaded: false, loading: false, ids: [] },
    });
  });

  it("adds search results and records the active query", () => {
    const searching = bookReducer(
      undefined,
      fromFindBookPage.searchQueryChanged({ query: "ngrx" }),
    );
    const result = bookReducer(
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
    const cleared = bookReducer(
      undefined,
      fromFindBookPage.searchQueryChanged({ query: "" }),
    );
    const failed = bookReducer(
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
    const withBook = bookReducer(
      undefined,
      fromBookExistsGuard.loadBook({ book }),
    );
    const result = bookReducer(
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
    const loading = bookReducer(undefined, fromCollectionPage.enter());
    const added = bookReducer(loading, fromSelectedBookPage.addBook({ book }));
    const removed = bookReducer(
      added,
      fromSelectedBookPage.removeBook({ book }),
    );

    expect(loading.collection.loading).toBe(true);
    expect(added.collection.ids).toEqual([book.id]);
    expect(removed.collection.ids).toEqual([]);
  });

  it("rolls back optimistic collection changes after API failures", () => {
    const added = bookReducer(
      undefined,
      fromSelectedBookPage.addBook({ book }),
    );
    const restoredAfterRemoveFailure = bookReducer(
      added,
      fromCollectionApi.removeBookFailure({ book }),
    );
    const removed = bookReducer(
      restoredAfterRemoveFailure,
      fromSelectedBookPage.removeBook({ book }),
    );
    const restoredAfterAddFailure = bookReducer(
      removed,
      fromCollectionApi.addBookFailure({ book }),
    );

    expect(restoredAfterRemoveFailure.collection.ids).toEqual([book.id]);
    expect(restoredAfterAddFailure.collection.ids).toEqual([]);
  });

  it("selects a book without duplicating an already loaded entity", () => {
    const loaded = bookReducer(
      undefined,
      fromBookExistsGuard.loadBook({ book }),
    );
    const duplicate = bookReducer(
      loaded,
      fromBookExistsGuard.loadBook({ book }),
    );
    const selected = bookReducer(
      duplicate,
      fromViewBookPage.selectBook({ id: book.id }),
    );

    expect(duplicate).toBe(loaded);
    expect(selected.books.selectedBookId).toBe(book.id);
  });

  it("resets the complete feature state on logout", () => {
    const loaded = bookReducer(
      undefined,
      fromBookExistsGuard.loadBook({ book }),
    );
    const searching = bookReducer(
      loaded,
      fromFindBookPage.searchQueryChanged({ query: "ngrx" }),
    );
    const loadingCollection = bookReducer(
      searching,
      fromCollectionPage.enter(),
    );

    expect(bookReducer(loadingCollection, fromAuth.logout())).toEqual(
      bookReducer(undefined, { type: "unknown" }),
    );
  });

  it("projects selected, search, and collection views", () => {
    const firstBookLoaded = bookReducer(
      undefined,
      fromBookExistsGuard.loadBook({ book }),
    );
    const booksLoaded = bookReducer(
      firstBookLoaded,
      fromBookExistsGuard.loadBook({ book: otherBook }),
    );
    const selected = bookReducer(
      booksLoaded,
      fromViewBookPage.selectBook({ id: book.id }),
    );
    const collectionLoaded = bookReducer(
      selected,
      fromCollectionApi.loadBooksSuccess({ books: [otherBook] }),
    );
    const searching = bookReducer(
      collectionLoaded,
      fromFindBookPage.searchQueryChanged({ query: "ngrx" }),
    );
    const searchedState = bookReducer(
      searching,
      fromBooksApi.searchSuccess({ books: [book, otherBook] }),
    );

    expect(booksViews.selectedBookId.projector(searchedState.books)).toBe(
      book.id,
    );
    expect(booksViews.bookEntities.projector(searchedState.books)).toEqual({
      [book.id]: book,
      [otherBook.id]: otherBook,
    });
    expect(booksViews.selectedBook.projector(searchedState.books)).toEqual(
      book,
    );
    expect(
      booksViews.searchResults.projector(
        searchedState.books,
        searchedState.search,
      ),
    ).toEqual([book, otherBook]);
    expect(booksViews.searchQuery.projector(searchedState.search)).toBe("ngrx");
    expect(booksViews.searchLoading.projector(searchedState.search)).toBe(
      false,
    );
    expect(booksViews.searchError.projector(searchedState.search)).toBe("");
    expect(
      booksViews.collectionLoaded.projector(searchedState.collection),
    ).toBe(true);
    expect(
      booksViews.collectionBookIds.projector(searchedState.collection),
    ).toEqual([otherBook.id]);
    expect(
      booksViews.isSelectedBookInCollection.projector(
        searchedState.books,
        searchedState.collection,
      ),
    ).toBe(false);
    expect(
      booksViews.bookCollection.projector(
        searchedState.books,
        searchedState.collection,
      ),
    ).toEqual([otherBook]);
  });
});
