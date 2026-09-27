import { Component, OnInit } from "@angular/core";

import { fromCollectionPage } from "@example-app/books/store/books.events";
import { booksViews } from "@example-app/books/store/books.state";
import { MatCard, MatCardTitle } from "@angular/material/card";
import { BookPreviewListComponent } from "../components/book-preview-list.component";

@Component({
  selector: "bc-collection-page",
  template: `
    <mat-card>
      <mat-card-title>My Collection</mat-card-title>
    </mat-card>

    <bc-book-preview-list [books]="books()"></bc-book-preview-list>
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
  imports: [MatCard, MatCardTitle, BookPreviewListComponent],
})
export class CollectionPageComponent implements OnInit {
  readonly books = booksViews.bookCollection.signal();

  ngOnInit() {
    fromCollectionPage.enter.publish();
  }
}
