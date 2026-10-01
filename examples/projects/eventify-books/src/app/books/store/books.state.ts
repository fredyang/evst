import { createEntityAdapter, type EntityState } from "@ngrx/entity";
import { state, view } from "@ngrx-eventify/store";
import type { Book } from "../models/book";
import {
  fromBookExistsGuard,
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
} from "./books.events";
import { fromAuth } from "@example-app/auth/store/auth.events";
interface EntityBooksState extends EntityState<Book> {
  selectedBookId: string | null;
}
interface BooksState {
  books: EntityBooksState;

  search: { ids: string[]; loading: boolean; error: string; query: string };

  collection: { loaded: boolean; loading: boolean; ids: string[] };
}

const adapter = createEntityAdapter<Book>();

const initialState: BooksState = {
  books: adapter.getInitialState<EntityBooksState>({ selectedBookId: null }),

  search: { ids: [], loading: false, error: "", query: "" },

  collection: { loaded: false, loading: false, ids: [] },
};

export const booksState = state("books", initialState)
  // define extra views
  .withViews(({ books, search, collection }) => ({
    selectedBookId: view(books, (x) => x.selectedBookId),

    bookEntities: view(books, (x) => x.entities),

    selectedBook: view(books, (x) =>
      x.selectedBookId ? x.entities[x.selectedBookId] : undefined,
    ),

    searchQuery: view(search, (x) => x.query),

    searchLoading: view(search, (x) => x.loading),

    searchError: view(search, (x) => x.error),

    searchResults: view(books, search, (b, s) =>
      s.ids
        .map((id) => b.entities[id])
        .filter((book): book is Book => book !== undefined),
    ),

    collectionLoaded: view(collection, (x) => x.loaded),

    collectionBookIds: view(collection, (x) => x.ids),

    bookCollection: view(books, collection, (b, c) =>
      c.ids
        .map((id) => b.entities[id])
        .filter((book): book is Book => book !== undefined),
    ),

    isSelectedBookInCollection: view(
      books,
      collection,
      (b, c) => !!b.selectedBookId && c.ids.includes(b.selectedBookId),
    ),
  }))
  // event handlers to map a current state + event data to a new state
  // Each `.on()` call defines how the state should change in response to specific events.
  //
  // Reset state on logout
  .on(fromAuth.logout, () => initialState)
  // Handle successful book search results
  .on(fromBooksApi.searchSuccess, (current, { books }) => ({
    ...current,
    books: adapter.addMany(books, current.books),
    search: {
      ids: books.map((x) => x.id),
      loading: false,
      error: "",
      query: current.search.query,
    },
  }))
  // Handle successful collection load
  .on(fromCollectionApi.loadBooksSuccess, (current, { books }) => ({
    ...current,
    books: adapter.addMany(books, current.books),
    collection: { loaded: true, loading: false, ids: books.map((x) => x.id) },
  }))

  // Handle loading a single book through the guard
  .on(fromBookExistsGuard.loadBook, (current, { book }) => {
    const books = adapter.addOne(book, current.books);
    return books === current.books ? current : { ...current, books };
  })

  .on(fromViewBookPage.selectBook, (current, { id }) => ({
    ...current,
    books: {
      ...current.books,
      selectedBookId: id,
    },
  }))

  .on(fromFindBookPage.searchQueryChanged, (current, { query }) => ({
    ...current,
    search:
      query === ""
        ? { ids: [], loading: false, error: "", query }
        : { ...current.search, loading: true, error: "", query },
  }))

  .on(fromBooksApi.searchFailure, (current, { errorMsg }) => ({
    ...current,
    search: { ...current.search, loading: false, error: errorMsg },
  }))

  .on(fromCollectionPage.enter, (current) => ({
    ...current,
    collection: { ...current.collection, loading: true },
  }))

  .on(
    fromSelectedBookPage.addBook,
    fromCollectionApi.removeBookFailure,
    (current, { book }) =>
      current.collection.ids.includes(book.id)
        ? current
        : {
            ...current,
            collection: {
              ...current.collection,
              ids: [...current.collection.ids, book.id],
            },
          },
  )

  .on(
    fromSelectedBookPage.removeBook,
    fromCollectionApi.addBookFailure,
    (current, { book }) => ({
      ...current,
      collection: {
        ...current.collection,
        ids: current.collection.ids.filter((id) => id !== book.id),
      },
    }),
  );

export const booksViews = booksState.views;
