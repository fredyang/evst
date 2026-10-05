import { inject } from "@angular/core";
import { task } from "@evst/store";
import { defer, EMPTY, of } from "rxjs";
import {
  catchError,
  debounceTime,
  map,
  mergeMap,
  skip,
  switchMap,
  takeUntil,
} from "rxjs/operators";

import { BookStorageService } from "../../core/services/book-storage.service";
import { GoogleBooksService } from "../../core/services/google-books.service";

import {
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
} from "./books.events";

export const booksTasks = task.handle((on) => ({
  search: on(
    fromFindBookPage.searchQueryChanged,
    (pipe, googleBooks = inject(GoogleBooksService)) => {
      return pipe(
        debounceTime(300),
        switchMap(({ query }) => {
          if (query === "") return EMPTY;
          return googleBooks.searchBooks(query).pipe(
            takeUntil(pipe(skip(1))),
            map((books) => fromBooksApi.searchSuccess({ books })),
            catchError((error) =>
              of(fromBooksApi.searchFailure({ errorMsg: error.message })),
            ),
          );
        }),
      );
    },
  ),

  // eslint-disable-next-line evst/require-task-event -- Validates the required storage capability when the Books feature initializes.
  checkStorageSupport: on(
    (storage = inject(BookStorageService)) => defer(() => storage.supported()),
    { dispatch: false },
  ),

  loadCollection: on(
    fromCollectionPage.enter,
    (pipe, storage = inject(BookStorageService)) =>
      pipe(
        switchMap(() => storage.getCollection()),
        map((books) => fromCollectionApi.loadBooksSuccess({ books })),
        catchError((error) =>
          of(fromCollectionApi.loadBooksFailure({ error })),
        ),
      ),
  ),

  addBook: on(
    fromSelectedBookPage.addBook,
    (pipe, storage = inject(BookStorageService)) =>
      pipe(
        mergeMap(({ book }) =>
          storage.addToCollection([book]).pipe(
            map(() => fromCollectionApi.addBookSuccess({ book })),
            catchError(() => of(fromCollectionApi.addBookFailure({ book }))),
          ),
        ),
      ),
  ),

  removeBook: on(
    fromSelectedBookPage.removeBook,
    (pipe, storage = inject(BookStorageService)) =>
      pipe(
        mergeMap(({ book }) =>
          storage.removeFromCollection([book.id]).pipe(
            map(() => fromCollectionApi.removeBookSuccess({ book })),

            catchError(() => of(fromCollectionApi.removeBookFailure({ book }))),
          ),
        ),
      ),
  ),
}));
