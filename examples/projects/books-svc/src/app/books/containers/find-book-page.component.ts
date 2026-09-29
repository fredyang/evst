import { Component } from "@angular/core";

import { Store } from "@ngrx/store";
import { Observable } from "rxjs";
import { take } from "rxjs/operators";

import { FindBookPageActions } from "@example-app/books/actions/find-book-page.actions";
import { Book } from "@example-app/books/models";
import * as fromBooks from "@example-app/books/reducers";
import { BookSearchComponent } from "../components/book-search.component";
import { BookPreviewListComponent } from "../components/book-preview-list.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-find-book-page",
  template: `
    <bc-book-search
      [query]="(searchQuery$ | async)!"
      [searching]="(loading$ | async)!"
      [error]="(error$ | async)!"
      (searchBooks)="search($event)"
    >
    </bc-book-search>
    <bc-book-preview-list [books]="(books$ | async)!"> </bc-book-preview-list>
  `,
  imports: [BookSearchComponent, BookPreviewListComponent, AsyncPipe],
})
export class FindBookPageComponent {
  searchQuery$: Observable<string>;
  books$: Observable<Book[]>;
  loading$: Observable<boolean>;
  error$: Observable<string>;

  constructor(private store: Store) {
    this.searchQuery$ = store.select(fromBooks.selectSearchQuery).pipe(take(1));
    this.books$ = store.select(fromBooks.selectSearchResults);
    this.loading$ = store.select(fromBooks.selectSearchLoading);
    this.error$ = store.select(fromBooks.selectSearchError);
  }

  search(query: string) {
    this.store.dispatch(FindBookPageActions.searchBooks({ query }));
  }
}
