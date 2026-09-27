import { Component } from "@angular/core";

import { fromFindBookPage } from "@example-app/books/store/books.events";
import { booksViews } from "@example-app/books/store/books.state";
import { BookSearchComponent } from "../components/book-search.component";
import { BookPreviewListComponent } from "../components/book-preview-list.component";

@Component({
  selector: "bc-find-book-page",
  template: `
    <bc-book-search
      [query]="searchQuery()"
      [searching]="loading()"
      [error]="error()"
      (searchBooks)="search($event)"
    >
    </bc-book-search>
    <bc-book-preview-list [books]="books()"> </bc-book-preview-list>
  `,
  imports: [BookSearchComponent, BookPreviewListComponent],
})
export class FindBookPageComponent {
  readonly searchQuery = booksViews.searchQuery.signal();
  readonly books = booksViews.searchResults.signal();
  readonly loading = booksViews.searchLoading.signal();
  readonly error = booksViews.searchError.signal();

  search(query: string) {
    fromFindBookPage.searchQueryChanged.publish({ query });
  }
}
