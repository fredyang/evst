import { taskOn } from "@evst/rtk";
import { latest } from "../../utils/concurrency";
import { debounce } from "../../utils/debounce";
import { bookStorage } from "../../services/book-storage";
import { googleBooksApi } from "../../services/google-books";
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

export const booksTasks = taskOn((on) => ({
  search: on(
    fromFindBookPage.searchQueryChanged,
    latest(
      debounce(async ({ query }: { query: string }) => {
        if (!query.trim()) return;

        try {
          const books = await googleBooksApi.search(query.trim());
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
        const book = await googleBooksApi.retrieve(id);
        return fromBooksApi.loadBookSuccess({ book });
      } catch (error) {
        return fromBooksApi.loadBookFailure({ id, error: message(error) });
      }
    }),
  ),

  loadCollection: on(fromCollectionPage.entered, () => {
    if (booksViews.collection.value().loaded) return;

    try {
      return fromCollectionApi.loadBooksSuccess({ books: bookStorage.load() });
    } catch (error) {
      return fromCollectionApi.loadBooksFailure({ error: message(error) });
    }
  }),

  retryCollection: on(fromCollectionPage.retryRequested, () => {
    if (booksViews.collection.value().loaded) return;

    try {
      return fromCollectionApi.loadBooksSuccess({ books: bookStorage.load() });
    } catch (error) {
      return fromCollectionApi.loadBooksFailure({ error: message(error) });
    }
  }),

  addBook: on(fromSelectedBookPage.addBook, ({ book }) => {
    try {
      bookStorage.add(book);
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
      bookStorage.remove(book);
      return fromCollectionApi.removeBookSuccess({ book });
    } catch (error) {
      return fromCollectionApi.removeBookFailure({
        book,
        error: message(error),
      });
    }
  }),
}));
