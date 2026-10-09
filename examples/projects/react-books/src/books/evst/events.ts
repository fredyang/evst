import { emptyProps, events, props } from "@evst/react";
import type { Book } from "../model/book";

export const fromFindBookPage = events("Find Book Page", {
  searchQueryChanged: props<{ query: string }>(),
});

export const fromBooksApi = events("Books API", {
  searchSuccess: props<{ query: string; books: Book[] }>(),
  searchFailure: props<{ query: string; error: string }>(),
  loadBookSuccess: props<{ book: Book }>(),
  loadBookFailure: props<{ id: string; error: string }>(),
});

export const fromCollectionPage = events("Collection Page", {
  entered: emptyProps(),
});

export const fromCollectionApi = events("Collection API", {
  loadBooksSuccess: props<{ books: Book[] }>(),
  loadBooksFailure: props<{ error: string }>(),
  addBookSuccess: props<{ book: Book }>(),
  addBookFailure: props<{ book: Book; error: string }>(),
  removeBookSuccess: props<{ book: Book }>(),
  removeBookFailure: props<{ book: Book; error: string }>(),
});

export const fromSelectedBookPage = events("Selected Book Page", {
  addBook: props<{ book: Book }>(),
  removeBook: props<{ book: Book }>(),
});

export const fromViewBookPage = events("View Book Page", {
  selected: props<{ id: string }>(),
});
