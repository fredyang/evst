import type { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import type { AppState } from "../app-state";
import { createBookStorage } from "../services/book-storage";
import { createGoogleBooksApi } from "../services/google-books";
import { GOOGLE_BOOKS_API_KEY } from "../config/google-books-api-key";
import { latest } from "../utils/latest";
import { booksActions } from "./books.slice";
import type { Book } from "./model/book";

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Unexpected error. Please try again.";
export function registerBooksListeners(
  listener: ListenerMiddlewareInstance<AppState>,
  googleBooks = createGoogleBooksApi(fetch, GOOGLE_BOOKS_API_KEY),
  storage = createBookStorage(),
) {
  const latestSearch = latest(
    async (query: string): Promise<{ books?: Book[]; error?: string }> => {
      if (!query.trim()) return { books: [] };
      try {
        return { books: await googleBooks.search(query.trim()) };
      } catch (error) {
        return { error: message(error) };
      }
    },
  );
  const latestRetrieve = latest(
    async (id: string): Promise<{ book?: Book; error?: string }> => {
      try {
        return { book: await googleBooks.retrieve(id) };
      } catch (error) {
        return { error: message(error) };
      }
    },
  );
  listener.startListening({
    actionCreator: booksActions.searchQueryChanged,
    effect: async ({ payload: query }, { dispatch }) => {
      const result = await latestSearch(query);
      if (!result) return;
      if (result.error)
        dispatch(booksActions.searchFailed({ query, error: result.error }));
      else
        dispatch(
          booksActions.searchSucceeded({ query, books: result.books ?? [] }),
        );
    },
  });

  listener.startListening({
    actionCreator: booksActions.bookSelected,
    effect: async ({ payload: id }, { getState, dispatch }) => {
      if (getState().books?.books.entities[id]) return;
      const result = await latestRetrieve(id);
      if (!result) return;
      if (result.error)
        dispatch(booksActions.bookLoadFailed({ id, error: result.error }));
      else if (result.book) dispatch(booksActions.bookLoaded(result.book));
    },
  });

  listener.startListening({
    actionCreator: booksActions.collectionLoadStarted,
    effect: (_action, { getState, dispatch }) => {
      if (getState().books?.collection.loaded) return;
      try {
        dispatch(booksActions.collectionLoaded(storage.load()));
      } catch (error) {
        dispatch(booksActions.collectionLoadFailed(message(error)));
      }
    },
  });

  listener.startListening({
    actionCreator: booksActions.bookAdded,
    effect: ({ payload: book }, { dispatch }) => {
      try {
        storage.add(book);
        dispatch(booksActions.collectionWriteSucceeded(book));
      } catch (error) {
        dispatch(
          booksActions.collectionWriteFailed({
            book,
            error: message(error),
            adding: true,
          }),
        );
      }
    },
  });

  listener.startListening({
    actionCreator: booksActions.bookRemoved,
    effect: ({ payload: book }, { dispatch }) => {
      try {
        storage.remove(book);
        dispatch(booksActions.collectionWriteSucceeded(book));
      } catch (error) {
        dispatch(
          booksActions.collectionWriteFailed({
            book,
            error: message(error),
            adding: false,
          }),
        );
      }
    },
  });
}
