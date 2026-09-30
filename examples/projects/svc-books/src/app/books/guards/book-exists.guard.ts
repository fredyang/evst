import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, Router } from "@angular/router";
import { map } from "rxjs/operators";
import { BooksService } from "@example-app/books/services/books.service";

export const bookExistsGuard = (route: ActivatedRouteSnapshot) => {
  const books = inject(BooksService);
  const router = inject(Router);

  return books
    .ensureBook(route.params["id"])
    .pipe(map((found) => found || router.createUrlTree(["/404"])));
};
