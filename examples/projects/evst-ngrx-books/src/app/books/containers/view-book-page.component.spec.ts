import { signal } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute } from "@angular/router";

import { ViewBookPageComponent } from "@example-app/books/containers";
import { fromViewBookPage } from "@example-app/books/evst/books.events";
import { booksViews } from "@example-app/books/evst/books.state";

describe("View Book Page", () => {
  let fixture: ComponentFixture<ViewBookPageComponent>;
  let route: ActivatedRoute;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.spyOn(booksViews.selectedBook, "signal").mockReturnValue(
      signal(undefined),
    );
    vi.spyOn(booksViews.isSelectedBookInCollection, "signal").mockReturnValue(
      signal(false),
    );
    vi.spyOn(fromViewBookPage.selectBook, "publish").mockImplementation(
      () => {},
    );

    TestBed.configureTestingModule({
      imports: [ViewBookPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: new BehaviorSubject({ id: "1" }) },
        },
      ],
    });

    fixture = TestBed.createComponent(ViewBookPageComponent);
    route = TestBed.inject(ActivatedRoute);
  });

  it("should compile", () => {
    fixture.detectChanges();

    expect(fixture).toMatchSnapshot();
  });

  it("should publish selectBook when route params change", () => {
    const payload = { id: "2" };

    (route.params as BehaviorSubject<{ id: string }>).next({ id: "2" });

    expect(fromViewBookPage.selectBook.publish).toHaveBeenLastCalledWith(
      payload,
    );
  });
  it("should publish the initial route book", () => {
    expect(fromViewBookPage.selectBook.publish).toHaveBeenCalledExactlyOnceWith(
      { id: "1" },
    );
  });

  it("should stop publishing after destruction", () => {
    fixture.destroy();
    vi.mocked(fromViewBookPage.selectBook.publish).mockClear();

    (route.params as BehaviorSubject<{ id: string }>).next({ id: "2" });

    expect(fromViewBookPage.selectBook.publish).not.toHaveBeenCalled();
  });
});
