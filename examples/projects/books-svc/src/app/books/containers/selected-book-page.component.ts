import { Component } from "@angular/core";

import { Book } from "@example-app/books/models";
import { BooksService } from "@example-app/books/services/books.service";
import { BookDetailComponent } from "../components/book-detail.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-selected-book-page",
  template: `
    <bc-book-detail
      [book]="books.selectedBook()!"
      [inCollection]="books.selectedBookInCollection()"
      (add)="addToCollection($event)"
      (remove)="removeFromCollection($event)"
    >
    </bc-book-detail>
  `,
  imports: [BookDetailComponent],
})
export class SelectedBookPageComponent {
  constructor(readonly books: BooksService) {}

  addToCollection(book: Book) {
    this.books.addToCollection(book);
  }

  removeFromCollection(book: Book) {
    this.books.removeFromCollection(book);
  }
}
