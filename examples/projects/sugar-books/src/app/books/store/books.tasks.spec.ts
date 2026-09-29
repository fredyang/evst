import { Actions } from "@ngrx/effects";
import type { Action } from "@ngrx/store";
import { createEnvironmentInjector } from "@angular/core";
import { BookStorageService } from "../../core/services/book-storage.service";
import { GoogleBooksService } from "../../core/services/google-books.service";
import { generateMockBook } from "../models/book";
import { of, Subject, throwError, type Observable } from "rxjs";
import { vi } from "vitest";
import {
  fromBooksApi,
  fromCollectionApi,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
} from "./books.events";
import { booksTasks } from "./books.tasks";

describe("booksTasks", () => {
  const book = generateMockBook();

  function setup() {
    const events = new Subject<Action>();
    const storage = {
      supported: vi.fn(() => of(true)),
      getCollection: vi.fn(() => of([book])),
      addToCollection: vi.fn(() => of([book])),
      removeFromCollection: vi.fn(() => of([])),
    };
    const googleBooks = { searchBooks: vi.fn(() => of([book])) };
    const injector = createEnvironmentInjector(
      [
        { provide: Actions, useValue: new Actions(events) },
        { provide: BookStorageService, useValue: storage },
        { provide: GoogleBooksService, useValue: googleBooks },
      ],
      null!,
    );
    const run = (task: () => Observable<unknown>) => {
      const output: Action[] = [];
      injector.runInContext(() =>
        task().subscribe((event) => output.push(event as Action)),
      );
      return output;
    };

    return { events, googleBooks, injector, run, storage };
  }

  it("searches after debounce and reports API failures", () => {
    vi.useFakeTimers();
    const context = setup();
    try {
      const output = context.run(booksTasks.effects.search);
      context.events.next(
        fromFindBookPage.searchQueryChanged({ query: "ngrx" }),
      );
      vi.advanceTimersByTime(300);
      context.googleBooks.searchBooks.mockReturnValueOnce(
        throwError(() => new Error("Unavailable")),
      );
      context.events.next(
        fromFindBookPage.searchQueryChanged({ query: "error" }),
      );
      vi.advanceTimersByTime(300);

      expect(context.googleBooks.searchBooks).toHaveBeenCalledWith("ngrx");
      expect(output).toEqual([
        fromBooksApi.searchSuccess({ books: [book] }),
        fromBooksApi.searchFailure({ errorMsg: "Unavailable" }),
      ]);
    } finally {
      context.injector.destroy();
      vi.useRealTimers();
    }
  });

  it("checks storage support as a non-dispatching task", () => {
    const context = setup();
    try {
      expect(context.run(booksTasks.effects.checkStorageSupport)).toEqual([
        true,
      ]);
      expect(context.storage.supported).toHaveBeenCalledOnce();
      expect(
        (
          booksTasks.effects.checkStorageSupport as unknown as Record<
            string,
            unknown
          >
        )["__@ngrx/effects_create__"],
      ).toMatchObject({ dispatch: false });
    } finally {
      context.injector.destroy();
    }
  });

  it("loads the collection and reports failures", () => {
    const context = setup();
    try {
      const output = context.run(booksTasks.effects.loadCollection);
      context.events.next(fromCollectionPage.enter());
      context.storage.getCollection.mockReturnValueOnce(
        throwError(() => new Error("Unavailable")),
      );
      context.events.next(fromCollectionPage.enter());

      expect(output).toEqual([
        fromCollectionApi.loadBooksSuccess({ books: [book] }),
        fromCollectionApi.loadBooksFailure({ error: expect.any(Error) }),
      ]);
    } finally {
      context.injector.destroy();
    }
  });

  it("persists collection additions and removals, including failures", () => {
    const context = setup();
    try {
      const added = context.run(booksTasks.effects.addBook);
      const removed = context.run(booksTasks.effects.removeBook);
      context.events.next(fromSelectedBookPage.addBook({ book }));
      context.events.next(fromSelectedBookPage.removeBook({ book }));
      context.storage.addToCollection.mockReturnValueOnce(
        throwError(() => new Error("Unavailable")),
      );
      context.storage.removeFromCollection.mockReturnValueOnce(
        throwError(() => new Error("Unavailable")),
      );
      context.events.next(fromSelectedBookPage.addBook({ book }));
      context.events.next(fromSelectedBookPage.removeBook({ book }));

      expect(context.storage.addToCollection).toHaveBeenCalledWith([book]);
      expect(context.storage.removeFromCollection).toHaveBeenCalledWith([
        book.id,
      ]);
      expect(added).toEqual([
        fromCollectionApi.addBookSuccess({ book }),
        fromCollectionApi.addBookFailure({ book }),
      ]);
      expect(removed).toEqual([
        fromCollectionApi.removeBookSuccess({ book }),
        fromCollectionApi.removeBookFailure({ book }),
      ]);
    } finally {
      context.injector.destroy();
    }
  });
});
