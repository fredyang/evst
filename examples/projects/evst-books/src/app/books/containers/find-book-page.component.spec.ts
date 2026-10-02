import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";

import { fromFindBookPage } from "@example-app/books/store/books.events";
import {
  BookAuthorsComponent,
  BookPreviewComponent,
  BookPreviewListComponent,
  BookSearchComponent,
} from "@example-app/books/components";
import { FindBookPageComponent } from "@example-app/books/containers";
import { booksViews } from "@example-app/books/store/books.state";
import { AddCommasPipe } from "@example-app/shared/pipes/add-commas.pipe";
import { EllipsisPipe } from "@example-app/shared/pipes/ellipsis.pipe";

describe("Find Book Page", () => {
  let fixture: ComponentFixture<FindBookPageComponent>;
  let instance: FindBookPageComponent;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.spyOn(booksViews.searchQuery, "signal").mockReturnValue(signal(""));
    vi.spyOn(booksViews.searchResults, "signal").mockReturnValue(signal([]));
    vi.spyOn(booksViews.searchLoading, "signal").mockReturnValue(signal(false));
    vi.spyOn(booksViews.searchError, "signal").mockReturnValue(signal(""));
    vi.spyOn(fromFindBookPage.searchQueryChanged, "publish").mockImplementation(
      () => {},
    );

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        ReactiveFormsModule,
        FindBookPageComponent,
        BookSearchComponent,
        BookPreviewComponent,
        BookPreviewListComponent,
        BookAuthorsComponent,
        AddCommasPipe,
        EllipsisPipe,
      ],
    });

    fixture = TestBed.createComponent(FindBookPageComponent);
    instance = fixture.componentInstance;
  });

  it("should compile", () => {
    fixture.detectChanges();

    expect(fixture).toMatchSnapshot();
  });

  it("should publish searchQueryChanged on search", () => {
    const $event = "book name";
    const payload = { query: $event };

    instance.search($event);

    expect(fromFindBookPage.searchQueryChanged.publish).toHaveBeenCalledWith(
      payload,
    );
  });
});
