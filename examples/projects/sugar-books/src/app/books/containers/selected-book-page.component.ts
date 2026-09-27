import { Component } from "@angular/core";

import { Book } from "@example-app/books/models";
import { fromSelectedBookPage } from "@example-app/books/store/books.events";
import { booksViews } from "@example-app/books/store/books.state";
import { BookDetailComponent } from "../components/book-detail.component";

@Component({
  selector: "bc-selected-book-page",
  template: `
    <bc-book-detail
      [book]="book()!"
      [inCollection]="isSelectedBookInCollection()"
      (add)="addToCollection($event)"
      (remove)="removeFromCollection($event)"
    >
    </bc-book-detail>
  `,
  imports: [BookDetailComponent],
})
export class SelectedBookPageComponent {
  readonly book = booksViews.selectedBook.signal();
  readonly isSelectedBookInCollection =
    booksViews.isSelectedBookInCollection.signal();

  addToCollection(book: Book) {
    fromSelectedBookPage.addBook.publish({ book });
  }

  removeFromCollection(book: Book) {
    fromSelectedBookPage.removeBook.publish({ book });
  }
}
