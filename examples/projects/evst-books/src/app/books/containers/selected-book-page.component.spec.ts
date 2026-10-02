import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

import { fromSelectedBookPage } from "@example-app/books/store/books.events";
import {
  BookAuthorsComponent,
  BookDetailComponent,
} from "@example-app/books/components";
import { SelectedBookPageComponent } from "@example-app/books/containers";
import { Book, generateMockBook } from "@example-app/books/models";
import { booksViews } from "@example-app/books/store/books.state";
import { AddCommasPipe } from "@example-app/shared/pipes/add-commas.pipe";

describe("Selected Book Page", () => {
  let fixture: ComponentFixture<SelectedBookPageComponent>;
  let instance: SelectedBookPageComponent;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.spyOn(booksViews.selectedBook, "signal").mockReturnValue(
      signal(undefined),
    );
    vi.spyOn(booksViews.isSelectedBookInCollection, "signal").mockReturnValue(
      signal(false),
    );
    vi.spyOn(fromSelectedBookPage.addBook, "publish").mockImplementation(
      () => {},
    );
    vi.spyOn(fromSelectedBookPage.removeBook, "publish").mockImplementation(
      () => {},
    );

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        SelectedBookPageComponent,
        BookDetailComponent,
        BookAuthorsComponent,
        AddCommasPipe,
      ],
    });

    fixture = TestBed.createComponent(SelectedBookPageComponent);
    instance = fixture.componentInstance;
  });

  it("should compile", () => {
    fixture.detectChanges();

    expect(fixture).toMatchSnapshot();
  });

  it("should publish addBook when addToCollection is called", () => {
    const $event: Book = generateMockBook();
    const payload = { book: $event };

    instance.addToCollection($event);

    expect(fromSelectedBookPage.addBook.publish).toHaveBeenLastCalledWith(
      payload,
    );
  });

  it("should publish removeBook on removeFromCollection", () => {
    const $event: Book = generateMockBook();
    const payload = { book: $event };

    instance.removeFromCollection($event);

    expect(fromSelectedBookPage.removeBook.publish).toHaveBeenLastCalledWith(
      payload,
    );
  });
});
