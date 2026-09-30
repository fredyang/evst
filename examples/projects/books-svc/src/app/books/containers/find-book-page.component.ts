import { Component, inject } from "@angular/core";

import { BooksService } from "@example-app/books/services/books.service";
import { BookSearchComponent } from "../components/book-search.component";
import { BookPreviewListComponent } from "../components/book-preview-list.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-find-book-page",
  template: `
    <bc-book-search
      [query]="searchQuery()"
      [searching]="searchLoading()"
      [error]="searchError()"
      (searchBooks)="search($event)"
    >
    </bc-book-search>
    <bc-book-preview-list [books]="searchResults()"> </bc-book-preview-list>
  `,
  imports: [BookSearchComponent, BookPreviewListComponent],
})
export class FindBookPageComponent {
  readonly booksService = inject(BooksService);

  searchQuery = this.booksService.searchQuery;
  searchLoading = this.booksService.searchLoading;
  searchError = this.booksService.searchError;
  searchResults = this.booksService.searchResults;

  search(query: string) {
    this.booksService.search(query);
  }
}
