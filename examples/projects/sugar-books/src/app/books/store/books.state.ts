import { createEntityAdapter, type EntityState } from "@ngrx/entity";
import { state, view } from "@ngrx-sugar/store";
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
import { booksTasks } from "./books.tasks";
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
  // Reset state on logout
  .on(fromAuth.logout, () => initialState)
  .on(fromBooksApi.searchSuccess, (s, { books }) => ({
    ...s,
    books: adapter.addMany(books, s.books),
    search: {
      ids: books.map((x) => x.id),
      loading: false,
      error: "",
      query: s.search.query,
    },
  }))

  .on(fromCollectionApi.loadBooksSuccess, (s, { books }) => ({
    ...s,
    books: adapter.addMany(books, s.books),
    collection: { loaded: true, loading: false, ids: books.map((x) => x.id) },
  }))

  .on(fromBookExistsGuard.loadBook, (s, { book }) => {
    const books = adapter.addOne(book, s.books);
    return books === s.books ? s : { ...s, books };
  })

  .on(fromViewBookPage.selectBook, (s, { id }) => ({
    ...s,
    books: { ...s.books, selectedBookId: id },
  }))

  .on(fromFindBookPage.searchQueryChanged, (s, { query }) => ({
    ...s,
    search:
      query === ""
        ? { ids: [], loading: false, error: "", query }
        : { ...s.search, loading: true, error: "", query },
  }))

  .on(fromBooksApi.searchFailure, (s, { errorMsg }) => ({
    ...s,
    search: { ...s.search, loading: false, error: errorMsg },
  }))

  .on(fromCollectionPage.enter, (s) => ({
    ...s,
    collection: { ...s.collection, loading: true },
  }))

  .on(
    fromSelectedBookPage.addBook,
    fromCollectionApi.removeBookFailure,
    (s, { book }) =>
      s.collection.ids.includes(book.id)
        ? s
        : {
            ...s,
            collection: {
              ...s.collection,
              ids: [...s.collection.ids, book.id],
            },
          },
  )

  .on(
    fromSelectedBookPage.removeBook,
    fromCollectionApi.addBookFailure,
    (s, { book }) => ({
      ...s,
      collection: {
        ...s.collection,
        ids: s.collection.ids.filter((id) => id !== book.id),
      },
    }),
  )
  .withTasks(booksTasks);

export const booksViews = booksState.views;
