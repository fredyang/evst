import { Component, inject, OnInit } from "@angular/core";

import { BooksService } from "@example-app/books/services/books.service";
import { MatCard, MatCardTitle } from "@angular/material/card";
import { BookPreviewListComponent } from "../components/book-preview-list.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-collection-page",
  template: `
    <mat-card>
      <mat-card-title>My Collection</mat-card-title>
    </mat-card>

    <bc-book-preview-list [books]="books"></bc-book-preview-list>
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
  readonly booksService = inject(BooksService);

  books = this.booksService.collection();

  ngOnInit() {
    this.booksService.loadCollection();
  }
}
