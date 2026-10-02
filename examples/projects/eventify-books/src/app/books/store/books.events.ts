import { emptyProps, props } from "@ngrx/store";
import { events } from "@ngrx-eventify/store";
import type { Book } from "../models/book";

export const fromBookExistsGuard = events("Book Exists Guard", {
  loadBook: props<{ book: Book }>(),
});

export const fromBooksApi = events("Books/API", {
  searchSuccess: props<{ books: Book[] }>(),
  searchFailure: props<{ errorMsg: string }>(),
});

export const fromCollectionApi = events("Collection/API", {
  addBookSuccess: props<{ book: Book }>(),

  addBookFailure: props<{ book: Book }>(),

  removeBookSuccess: props<{ book: Book }>(),

  removeBookFailure: props<{ book: Book }>(),

  loadBooksSuccess: props<{ books: Book[] }>(),

  loadBooksFailure: props<{ error: unknown }>(),
});

export const fromCollectionPage = events("Collection Page", {
  enter: emptyProps(),
});

export const fromFindBookPage = events("Find Book Page", {
  searchQueryChanged: props<{ query: string }>(),
});

export const fromSelectedBookPage = events("Selected Book Page", {
  addBook: props<{ book: Book }>(),
  removeBook: props<{ book: Book }>(),
});

export const fromViewBookPage = events("View Book Page", {
  selectBook: props<{ id: string }>(),
});
