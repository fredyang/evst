import { afterEach, expect, it, vi } from "vitest";
import { createAppStore } from "../src/store";
import { registerBooksListeners } from "../src/books/books.listeners";
import { booksActions, booksReducer } from "../src/books/books.slice";
import { authActions } from "../src/auth/auth.slice";
import type { Book } from "../src/books/model/book";

const book: Book = {
  id: "one",
  title: "Book",
  authors: [],
  description: "",
  cover: "",
};

function setup() {
  let saved: Book[] = [];
  const googleBooks = {
    search: vi.fn(async (_query: string) => [book]),
    retrieve: vi.fn(async (_id: string) => book),
  };
  const storage = {
    load: vi.fn(() => saved),
    add: vi.fn((value: Book) => {
      saved = [...saved.filter((item) => item.id !== value.id), value];
    }),
    remove: vi.fn((value: Book) => {
      saved = saved.filter((item) => item.id !== value.id);
    }),
  };
  const store = createAppStore();
  store.injectFeature("books", booksReducer, () =>
    registerBooksListeners(store.listenerMiddleware, googleBooks, storage),
  );
  return { store, googleBooks, storage };
}

afterEach(() => vi.restoreAllMocks());

it("loads search and detail results through listener middleware", async () => {
  const { store, googleBooks } = setup();
  store.dispatch(booksActions.searchQueryChanged("react"));
  await vi.waitFor(() =>
    expect(store.getState().books?.search.ids).toEqual(["one"]),
  );
  expect(googleBooks.search).toHaveBeenCalledWith("react");
  store.dispatch(authActions.loggedOut());
  store.dispatch(booksActions.bookSelected("one"));
  await vi.waitFor(() =>
    expect(store.getState().books?.books.entities.one).toEqual(book),
  );
  expect(googleBooks.retrieve).toHaveBeenCalledWith("one");
});

it("persists collection writes and restores the collection after logout", async () => {
  const { store, storage } = setup();
  store.dispatch(booksActions.collectionLoadStarted());
  await vi.waitFor(() => expect(storage.load).toHaveBeenCalledOnce());
  store.dispatch(booksActions.bookAdded(book));
  await vi.waitFor(() => expect(storage.add).toHaveBeenCalledWith(book));
  await vi.waitFor(() =>
    expect(store.getState().books?.collection.pending.one).toBeUndefined(),
  );
  store.dispatch(authActions.loggedOut());
  store.dispatch(booksActions.collectionLoadStarted());
  await vi.waitFor(() =>
    expect(store.getState().books?.collection.ids).toEqual(["one"]),
  );
});
