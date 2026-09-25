import { Component, Input } from "@angular/core";

import { Book } from "@example-app/books/models";
import { NgFor } from "@angular/common";
import { BookPreviewComponent } from "./book-preview.component";

@Component({
  selector: "bc-book-preview-list",
  template: `
    <bc-book-preview *ngFor="let book of books" [book]="book"></bc-book-preview>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      }
    `,
  ],
  imports: [NgFor, BookPreviewComponent],
})
export class BookPreviewListComponent {
  @Input() books!: Book[];
}
