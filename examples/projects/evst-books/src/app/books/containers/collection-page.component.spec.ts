import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";

import { fromCollectionPage } from "@example-app/books/store/books.events";
import {
  BookAuthorsComponent,
  BookPreviewComponent,
  BookPreviewListComponent,
} from "@example-app/books/components";
import { CollectionPageComponent } from "@example-app/books/containers";
import { booksViews } from "@example-app/books/store/books.state";
import { AddCommasPipe } from "@example-app/shared/pipes/add-commas.pipe";
import { EllipsisPipe } from "@example-app/shared/pipes/ellipsis.pipe";

describe("Collection Page", () => {
  let fixture: ComponentFixture<CollectionPageComponent>;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.spyOn(booksViews.bookCollection, "signal").mockReturnValue(signal([]));
    vi.spyOn(fromCollectionPage.enter, "publish").mockImplementation(() => {});

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        CollectionPageComponent,
        BookPreviewListComponent,
        BookPreviewComponent,
        BookAuthorsComponent,
        AddCommasPipe,
        EllipsisPipe,
      ],
    });

    fixture = TestBed.createComponent(CollectionPageComponent);
  });

  it("should compile", () => {
    fixture.detectChanges();

    expect(fixture).toMatchSnapshot();
  });

  it("should publish enter on init", () => {
    fixture.detectChanges();

    expect(fromCollectionPage.enter.publish).toHaveBeenCalledWith();
  });
});
