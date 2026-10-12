import { task } from "@evst/rtk";
import { latest } from "../../utils/concurrency";
import { debounce } from "../../utils/debounce";
import { GOOGLE_BOOKS_API_KEY } from "../../config/google-books-api-key";
import { createBookStorage } from "../../services/book-storage";
import { createGoogleBooksApi } from "../../services/google-books";
import { booksViews } from "./books.state";
import {
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
} from "./books.events";

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
      latest(
        debounce(async ({ query }: { query: string }) => {
          if (!query.trim()) return;

          try {
            const books = await googleBooks.search(query.trim());
            return fromBooksApi.searchSuccess({ query, books });
          } catch (error) {
            return fromBooksApi.searchFailure({ query, error: message(error) });
          }
        }, 500),
      ),
    ),

    retrieveSelectedBook: on(
      fromViewBookPage.selected,
      latest(async ({ id }: { id: string }) => {
        if (booksViews.books.value().entities[id]) return;

        try {
          const book = await googleBooks.retrieve(id);
          return fromBooksApi.loadBookSuccess({ book });
        } catch (error) {
          return fromBooksApi.loadBookFailure({ id, error: message(error) });
        }
      }),
    ),

    loadCollection: on(fromCollectionPage.entered, () => {
      if (booksViews.collection.value().loaded) return;

      try {
        return fromCollectionApi.loadBooksSuccess({ books: storage.load() });
      } catch (error) {
        return fromCollectionApi.loadBooksFailure({ error: message(error) });
      }
    }),

    addBook: on(fromSelectedBookPage.addBook, ({ book }) => {
      try {
        storage.add(book);
        return fromCollectionApi.addBookSuccess({ book });
      } catch (error) {
        return fromCollectionApi.addBookFailure({
          book,
          error: message(error),
        });
      }
    }),

    removeBook: on(fromSelectedBookPage.removeBook, ({ book }) => {
      try {
        storage.remove(book);
        return fromCollectionApi.removeBookSuccess({ book });
      } catch (error) {
        return fromCollectionApi.removeBookFailure({
          book,
          error: message(error),
        });
      }
    }),
  }));
}
