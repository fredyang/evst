import { task } from "@evst/react";
import { GOOGLE_BOOKS_API_KEY } from "../../config/google-books-api-key";
import { createBookStorage } from "../../services/book-storage";
import { createGoogleBooksApi } from "../../services/google-books";
import type { BooksRoot } from "./state";
import {
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
} from "./events";

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Unexpected error. Please try again.";

export function createBooksTasks(
  googleBooks = createGoogleBooksApi(fetch, GOOGLE_BOOKS_API_KEY),
  storage = createBookStorage(),
) {
  return task.handle((on) => ({
    search: on(
      fromFindBookPage.searchQueryChanged,
      async ({ payload: { query } }, api) => {
        api.cancelActiveListeners();

        if (!query.trim()) return;

        try {
          await api.delay(300);
          const books = await googleBooks.search(query.trim(), api.signal);

          if (!api.signal.aborted) {
            api.dispatch(fromBooksApi.searchSuccess({ query, books }));
          }
        } catch (error) {
          if (!api.signal.aborted) {
            api.dispatch(
              fromBooksApi.searchFailure({ query, error: message(error) }),
            );
          }
        }
      },
    ),
    retrieveSelectedBook: on(
      fromViewBookPage.selected,
      async ({ payload: { id } }, api) => {
        api.cancelActiveListeners();

        if ((api.getState() as BooksRoot).books.books.entities[id]) return;

        try {
          const book = await googleBooks.retrieve(id, api.signal);

          if (!api.signal.aborted) {
            api.dispatch(fromBooksApi.loadBookSuccess({ book }));
          }
        } catch (error) {
          if (!api.signal.aborted) {
            api.dispatch(
              fromBooksApi.loadBookFailure({ id, error: message(error) }),
            );
          }
        }
      },
    ),
    loadCollection: on(fromCollectionPage.entered, (_action, api) => {
      if ((api.getState() as BooksRoot).books.collection.loaded) return;

      try {
        api.dispatch(
          fromCollectionApi.loadBooksSuccess({ books: storage.load() }),
        );
      } catch (error) {
        api.dispatch(
          fromCollectionApi.loadBooksFailure({ error: message(error) }),
        );
      }
    }),
    addBook: on(fromSelectedBookPage.addBook, ({ payload: { book } }, api) => {
      try {
        storage.add(book);
        api.dispatch(fromCollectionApi.addBookSuccess({ book }));
      } catch (error) {
        api.dispatch(
          fromCollectionApi.addBookFailure({ book, error: message(error) }),
        );
      }
    }),
    removeBook: on(
      fromSelectedBookPage.removeBook,
      ({ payload: { book } }, api) => {
        try {
          storage.remove(book);
          api.dispatch(fromCollectionApi.removeBookSuccess({ book }));
        } catch (error) {
          api.dispatch(
            fromCollectionApi.removeBookFailure({
              book,
              error: message(error),
            }),
          );
        }
      },
    ),
  }));
}
