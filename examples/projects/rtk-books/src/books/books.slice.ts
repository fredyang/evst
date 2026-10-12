import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { authActions } from "../auth/auth.slice";
import type { Book } from "./model/book";

const adapter = createEntityAdapter<Book>();

export const initialBooksState = {
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

const booksSlice = createSlice({
  name: "books",
  initialState: initialBooksState,
  reducers: {
    searchQueryChanged(state, action: PayloadAction<string>) {
      const query = action.payload;
      state.search = {
        query,
        ids: [],
        loading: Boolean(query.trim()),
        error: "",
      };
    },
    searchSucceeded(
      state,
      action: PayloadAction<{ query: string; books: Book[] }>,
    ) {
      if (action.payload.query !== state.search.query) return;
      adapter.upsertMany(state.books, action.payload.books);
      state.search.ids = action.payload.books.map((book) => book.id);
      state.search.loading = false;
    },
    searchFailed(
      state,
      action: PayloadAction<{ query: string; error: string }>,
    ) {
      if (action.payload.query !== state.search.query) return;
      state.search.loading = false;
      state.search.error = action.payload.error;
    },
    bookSelected(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.detail = { id, loading: !state.books.entities[id], error: "" };
    },
    bookLoaded(state, action: PayloadAction<Book>) {
      adapter.upsertOne(state.books, action.payload);
      if (state.detail.id === action.payload.id) state.detail.loading = false;
    },
    bookLoadFailed(
      state,
      action: PayloadAction<{ id: string; error: string }>,
    ) {
      if (state.detail.id !== action.payload.id) return;
      state.detail.loading = false;
      state.detail.error = action.payload.error;
    },
    collectionLoadStarted(state) {
      if (!state.collection.loaded) state.collection.loading = true;
    },
    collectionLoaded(state, action: PayloadAction<Book[]>) {
      adapter.upsertMany(state.books, action.payload);
      state.collection = {
        ids: action.payload.map((book) => book.id),
        loaded: true,
        loading: false,
        error: "",
        pending: {},
      };
    },
    collectionLoadFailed(state, action: PayloadAction<string>) {
      state.collection.loading = false;
      state.collection.error = action.payload;
    },
    bookAdded(state, action: PayloadAction<Book>) {
      const book = action.payload;
      adapter.upsertOne(state.books, book);
      if (!state.collection.ids.includes(book.id))
        state.collection.ids.push(book.id);
      state.collection.pending[book.id] = true;
      state.collection.error = "";
    },
    bookRemoved(state, action: PayloadAction<Book>) {
      const book = action.payload;
      state.collection.ids = state.collection.ids.filter(
        (id) => id !== book.id,
      );
      state.collection.pending[book.id] = true;
      state.collection.error = "";
    },
    collectionWriteSucceeded(state, action: PayloadAction<Book>) {
      delete state.collection.pending[action.payload.id];
    },
    collectionWriteFailed(
      state,
      action: PayloadAction<{ book: Book; error: string; adding: boolean }>,
    ) {
      const { book, error, adding } = action.payload;
      if (adding)
        state.collection.ids = state.collection.ids.filter(
          (id) => id !== book.id,
        );
      else if (!state.collection.ids.includes(book.id))
        state.collection.ids.push(book.id);
      delete state.collection.pending[book.id];
      state.collection.error = error;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(authActions.loggedOut, () => initialBooksState),
});

export const booksActions = booksSlice.actions;
export const booksReducer = booksSlice.reducer;
export type BooksState = typeof initialBooksState;
export const selectBooksState = (root: { books?: BooksState }) =>
  root.books ?? initialBooksState;
export const selectSearch = (root: { books?: BooksState }) =>
  selectBooksState(root).search;
export const selectCollection = (root: { books?: BooksState }) =>
  selectBooksState(root).collection;
export const selectDetail = (root: { books?: BooksState }) =>
  selectBooksState(root).detail;
export const selectResults = (root: { books?: BooksState }) =>
  selectBooksState(root)
    .search.ids.map((id) => selectBooksState(root).books.entities[id])
    .filter((book): book is Book => Boolean(book));
export const selectSelectedBook = (root: { books?: BooksState }) => {
  const books = selectBooksState(root);
  const id = books.detail.id;
  return id ? books.books.entities[id] : undefined;
};
export const selectCollectionBooks = (root: { books?: BooksState }) =>
  selectBooksState(root)
    .collection.ids.map((id) => selectBooksState(root).books.entities[id])
    .filter((book): book is Book => Boolean(book));
