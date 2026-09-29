import { Component } from "@angular/core";

import { BooksService } from "@example-app/books/services/books.service";
import { BookSearchComponent } from "../components/book-search.component";
import { BookPreviewListComponent } from "../components/book-preview-list.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-find-book-page",
  template: `
    <bc-book-search
      [query]="books.searchQuery()"
      [searching]="books.searchLoading()"
      [error]="books.searchError()"
      (searchBooks)="search($event)"
    >
    </bc-book-search>
    <bc-book-preview-list [books]="books.searchResults()">
    </bc-book-preview-list>
  `,
  imports: [BookSearchComponent, BookPreviewListComponent],
})
export class FindBookPageComponent {
  constructor(readonly books: BooksService) {}

  search(query: string) {
    this.books.search(query);
  }
}
