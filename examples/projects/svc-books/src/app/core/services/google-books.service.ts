import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { GOOGLE_BOOKS_API_KEY } from "@books-example/config";
import { Book } from "../../books/models/book";

@Injectable({
  providedIn: "root",
})
export class GoogleBooksService {
  private readonly http = inject(HttpClient);
  private API_PATH = "https://www.googleapis.com/books/v1/volumes";

  searchBooks(queryTitle: string): Observable<Book[]> {
    return this.http
      .get<{ items: Book[] }>(this.API_PATH, {
        params: new HttpParams()
          .set("orderBy", "newest")
          .set("q", queryTitle)
          .set("key", GOOGLE_BOOKS_API_KEY),
      })
      .pipe(map((books) => books.items || []));
  }

  retrieveBook(volumeId: string): Observable<Book> {
    return this.http.get<Book>(
      `${this.API_PATH}/${volumeId}?key=${GOOGLE_BOOKS_API_KEY}`,
    );
  }
}
