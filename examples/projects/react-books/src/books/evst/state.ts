import { createEntityAdapter } from "@reduxjs/toolkit";
import { state, view } from "@evst/react";
import type { Book } from "../model/book";
import {
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
} from "./events";

const adapter = createEntityAdapter<Book>();

export const initialState = {
  books: adapter.getInitialState(),
  search: { query: "", ids: [] as string[], loading: false, error: "" },
  collection: {
    ids: [] as string[],
    loaded: false,
    loading: false,
    error: "",
    pending: {} as Record<string, boolean>,
  },
  detail: { id: null as string | null, loading: false, error: "" },
};

export type BooksRoot = { books: typeof initialState };

export const booksState = state("books", initialState).handle((on) => ({
  beginSearch: on(
    fromFindBookPage.searchQueryChanged,
    (s, { payload: { query } }) => {
      s.search = { query, ids: [], loading: Boolean(query.trim()), error: "" };
    },
  ),
  applySearchResults: on(fromBooksApi.searchSuccess, (s, { payload: p }) => {
    if (p.query !== s.search.query) return;

    adapter.upsertMany(s.books, p.books);
    s.search.ids = p.books.map((book) => book.id);
    s.search.loading = false;
  }),
  recordSearchFailure: on(fromBooksApi.searchFailure, (s, { payload: p }) => {
    if (p.query !== s.search.query) return;

    s.search.loading = false;
    s.search.error = p.error;
  }),
  selectBook: on(fromViewBookPage.selected, (s, { payload: { id } }) => {
    s.detail = { id, loading: !s.books.entities[id], error: "" };
  }),
  storeDetail: on(fromBooksApi.loadBookSuccess, (s, { payload: { book } }) => {
    adapter.upsertOne(s.books, book);

    if (s.detail.id === book.id) s.detail.loading = false;
  }),
  recordDetailFailure: on(fromBooksApi.loadBookFailure, (s, { payload: p }) => {
    if (s.detail.id !== p.id) return;

    s.detail.loading = false;
    s.detail.error = p.error;
  }),
  beginCollectionLoad: on(fromCollectionPage.entered, (s) => {
    if (!s.collection.loaded) s.collection.loading = true;
  }),
  applyCollection: on(
    fromCollectionApi.loadBooksSuccess,
    (s, { payload: { books } }) => {
      adapter.upsertMany(s.books, books);
      s.collection = {
        ids: books.map((book) => book.id),
        loading: false,
        loaded: true,
        error: "",
        pending: {},
      };
    },
  ),
  recordCollectionFailure: on(
    fromCollectionApi.loadBooksFailure,
    (s, { payload: p }) => {
      s.collection.loading = false;
      s.collection.error = p.error;
    },
  ),
  addCollectionBook: on(
    fromSelectedBookPage.addBook,
    (s, { payload: { book } }) => {
      adapter.upsertOne(s.books, book);

      if (!s.collection.ids.includes(book.id)) s.collection.ids.push(book.id);

      s.collection.pending[book.id] = true;
      s.collection.error = "";
    },
  ),
  removeCollectionBook: on(
    fromSelectedBookPage.removeBook,
    (s, { payload: { book } }) => {
      s.collection.ids = s.collection.ids.filter((id) => id !== book.id);
      s.collection.pending[book.id] = true;
      s.collection.error = "";
    },
  ),
  confirmAdd: on(
    fromCollectionApi.addBookSuccess,
    (s, { payload: { book } }) => {
      delete s.collection.pending[book.id];
    },
  ),
  confirmRemove: on(
    fromCollectionApi.removeBookSuccess,
    (s, { payload: { book } }) => {
      delete s.collection.pending[book.id];
    },
  ),
  undoFailedAdd: on(fromCollectionApi.addBookFailure, (s, { payload: p }) => {
    s.collection.ids = s.collection.ids.filter((id) => id !== p.book.id);
    delete s.collection.pending[p.book.id];
    s.collection.error = p.error;
  }),
  undoFailedRemove: on(
    fromCollectionApi.removeBookFailure,
    (s, { payload: p }) => {
      if (!s.collection.ids.includes(p.book.id)) {
        s.collection.ids.push(p.book.id);
      }

      delete s.collection.pending[p.book.id];
      s.collection.error = p.error;
    },
  ),
}));

export const booksViews = {
  ...booksState.views,
  results: view(
    booksState.views.books,
    booksState.views.search,
    (books, search) =>
      search.ids
        .map((id) => books.entities[id])
        .filter((book): book is Book => Boolean(book)),
  ),
  selectedBook: view(
    booksState.views.books,
    booksState.views.detail,
    (books, detail) => (detail.id ? books.entities[detail.id] : undefined),
  ),
  collectionBooks: view(
    booksState.views.books,
    booksState.views.collection,
    (books, collection) =>
      collection.ids
        .map((id) => books.entities[id])
        .filter((book): book is Book => Boolean(book)),
  ),
};
