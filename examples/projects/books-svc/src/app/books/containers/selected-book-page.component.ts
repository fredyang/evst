import { Component, inject } from "@angular/core";

import { Book } from "@example-app/books/models";
import { BooksService } from "@example-app/books/services/books.service";
import { BookDetailComponent } from "../components/book-detail.component";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "bc-selected-book-page",
  template: `
    <bc-book-detail
      [book]="selectedBook()!"
      [inCollection]="selectedBookInCollection()"
      (add)="addToCollection($event)"
      (remove)="removeFromCollection($event)"
    >
    </bc-book-detail>
  `,
  imports: [BookDetailComponent],
})
export class SelectedBookPageComponent {
  readonly booksService = inject(BooksService);
  selectedBook = this.booksService.selectedBook;
  selectedBookInCollection = this.booksService.selectedBookInCollection;

  addToCollection(book: Book) {
    this.booksService.addToCollection(book);
  }

  removeFromCollection(book: Book) {
    this.booksService.removeFromCollection(book);
  }
}
