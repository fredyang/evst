import { expect, it } from "vitest";
import { authActions, authReducer } from "../src/auth/auth.slice";
import { coreActions, coreReducer } from "../src/core/core.slice";
import {
  booksActions,
  booksReducer,
  initialBooksState,
} from "../src/books/books.slice";
import type { Book } from "../src/books/model/book";

const book: Book = {
  id: "one",
  title: "Book",
  authors: [],
  description: "",
  cover: "",
};

it("applies auth transitions and closes the sidebar on sign-out", () => {
  let auth = authReducer(
    undefined,
    authActions.loginRequested({ username: "ngrx", password: "x" }),
  );
  expect(auth.pending).toBe(true);
  auth = authReducer(auth, authActions.loginSucceeded({ name: "User" }));
  expect(auth.user).toEqual({ name: "User" });
  let core = coreReducer(undefined, coreActions.sidenavOpened());
  core = coreReducer(core, authActions.logoutConfirmationRequested());
  expect(core.showSidenav).toBe(false);
  auth = authReducer(auth, authActions.loggedOut());
  expect(auth.user).toBeNull();
});

it("resets all Books state on logout while leaving persistent storage outside Redux", () => {
  let books = booksReducer(undefined, booksActions.searchQueryChanged("react"));
  books = booksReducer(books, booksActions.bookAdded(book));
  expect(books.search.query).toBe("react");
  expect(books.collection.ids).toEqual(["one"]);
  books = booksReducer(books, authActions.loggedOut());
  expect(books).toEqual(initialBooksState);
});
