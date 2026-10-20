import { inject } from "@angular/core";
import { Router, ActivatedRouteSnapshot } from "@angular/router";
import { Observable, of } from "rxjs";
import { catchError, filter, map, switchMap, take, tap } from "rxjs/operators";

import { GoogleBooksService } from "@example-app/core/services";
import { fromBookExistsGuard } from "@example-app/books/evst/books.events";
import { booksViews } from "@example-app/books/evst/books.state";

// Ensure the requested book is cached before opening its details page.
export const bookExistsGuard = (
  route: ActivatedRouteSnapshot,
): Observable<boolean> => {
  const googleBooks = inject(GoogleBooksService);
  const router = inject(Router);
  const id = route.params["id"];

  return booksViews.collectionLoaded.observable().pipe(
    filter((loaded) => loaded),
    take(1),
    switchMap(() => booksViews.bookEntities.observable().pipe(take(1))),
    switchMap((entities) => {
      if (entities[id]) return of(true);

      return googleBooks.retrieveBook(id).pipe(
        tap((book) => fromBookExistsGuard.loadBook.publish({ book })),
        map((book) => !!book),
        catchError(() => {
          router.navigate(["/404"]);
          return of(false);
        }),
      );
    }),
  );
};
