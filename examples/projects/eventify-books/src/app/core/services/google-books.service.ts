import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { Book } from "../../books/models/book";

@Injectable({
  providedIn: "root",
})
export class GoogleBooksService {
  private readonly http = inject(HttpClient);
  private API_PATH = "https://www.googleapis.com/books/v1/volumes";
  // Replace with your actual API key, this key may be expired already
  private API_KEY = "AIzaSyDiA4hns3zwhOD8zYqJ6J_V9b8MPynL0mo";

  searchBooks(queryTitle: string): Observable<Book[]> {
    return this.http
      .get<{ items: Book[] }>(
        `${this.API_PATH}?orderBy=newest&q=${queryTitle}&key=${this.API_KEY}`,
      )
      .pipe(map((books) => books.items || []));
  }

  retrieveBook(volumeId: string): Observable<Book> {
    return this.http.get<Book>(
      `${this.API_PATH}/${volumeId}?key=${this.API_KEY}`,
    );
  }
}
