import { Component, OnInit } from "@angular/core";

import { Store } from "@ngrx/store";
import { Observable } from "rxjs";

import { CollectionPageActions } from "@example-app/books/actions/collection-page.actions";
import { Book } from "@example-app/books/models";
import * as fromBooks from "@example-app/books/reducers";
import { MatCard, MatCardTitle } from "@angular/material/card";
import { BookPreviewListComponent } from "../components/book-preview-list.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-collection-page",
  template: `
    <mat-card>
      <mat-card-title>My Collection</mat-card-title>
    </mat-card>

    <bc-book-preview-list [books]="(books$ | async)!"></bc-book-preview-list>
  `,
  /**
   * Container components are permitted to have just enough styles
   * to bring the view together. If the number of styles grow,
   * consider breaking them out into presentational
   * components.
   */
  styles: [
    `
      mat-card-title {
        display: flex;
        justify-content: center;
        padding: 1rem;
      }
    `,
  ],
  imports: [MatCard, MatCardTitle, BookPreviewListComponent, AsyncPipe],
})
export class CollectionPageComponent implements OnInit {
  books$: Observable<Book[]>;

  constructor(private store: Store) {
    this.books$ = store.select(fromBooks.selectBookCollection);
  }

  ngOnInit() {
    this.store.dispatch(CollectionPageActions.enter());
  }
}
