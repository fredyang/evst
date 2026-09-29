import { computed, inject, Injectable, signal } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { Book } from "@example-app/books/models";
import {
  BookStorageService,
  GoogleBooksService,
} from "@example-app/core/services";

/** A feature-owned store implemented with Angular signals and RxJS services. */
@Injectable({ providedIn: "root" })
export class BooksService {
  private readonly storage = inject(BookStorageService);
  private readonly googleBooks = inject(GoogleBooksService);
  private readonly entitiesState = signal<Record<string, Book>>({});
  private readonly collectionIdsState = signal<string[]>([]);
  private readonly searchIdsState = signal<string[]>([]);
  private readonly selectedIdState = signal<string | null>(null);

  readonly collectionLoaded = signal(false);
  readonly collectionLoading = signal(false);
  readonly searchQuery = signal("");
  readonly searchLoading = signal(false);
  readonly searchError = signal("");

  readonly collection = computed(() =>
    this.booksFor(this.collectionIdsState()),
  );
  readonly searchResults = computed(() => this.booksFor(this.searchIdsState()));
  readonly selectedBook = computed(() => {
    const id = this.selectedIdState();
    return id ? (this.entitiesState()[id] ?? null) : null;
  });
  readonly selectedBookInCollection = computed(() => {
    const id = this.selectedIdState();
    return id !== null && this.collectionIdsState().includes(id);
  });

  loadCollection(): void {
    if (this.collectionLoading() || this.collectionLoaded()) return;

    this.collectionLoading.set(true);
    this.storage.getCollection().subscribe({
      next: (books) => {
        this.cache(books);
        this.collectionIdsState.set(books.map((book) => book.id));
        this.collectionLoaded.set(true);
        this.collectionLoading.set(false);
      },
      error: () => this.collectionLoading.set(false),
    });
  }

  search(query: string): void {
    this.searchQuery.set(query);
    this.searchError.set("");
    if (!query) {
      this.searchIdsState.set([]);
      this.searchLoading.set(false);
      return;
    }

    this.searchLoading.set(true);
    this.googleBooks.searchBooks(query).subscribe({
      next: (books) => {
        if (this.searchQuery() !== query) return;
        this.cache(books);
        this.searchIdsState.set(books.map((book) => book.id));
        this.searchLoading.set(false);
      },
      error: (error: { message?: string }) => {
        if (this.searchQuery() !== query) return;
        this.searchError.set(error.message ?? "Unable to search for books");
        this.searchLoading.set(false);
      },
    });
  }

  selectBook(id: string): void {
    this.selectedIdState.set(id);
  }

  ensureBook(id: string): Observable<boolean> {
    if (this.entitiesState()[id]) return of(true);

    return this.googleBooks.retrieveBook(id).pipe(
      tap((book) => this.cache([book])),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  addToCollection(book: Book): void {
    if (this.collectionIdsState().includes(book.id)) return;

    this.storage.addToCollection([book]).subscribe({
      next: () => {
        this.cache([book]);
        this.collectionIdsState.update((ids) => [...ids, book.id]);
      },
    });
  }

  removeFromCollection(book: Book): void {
    this.storage.removeFromCollection([book.id]).subscribe({
      next: () =>
        this.collectionIdsState.update((ids) =>
          ids.filter((id) => id !== book.id),
        ),
    });
  }

  private cache(books: Book[]): void {
    this.entitiesState.update((entities) => ({
      ...entities,
      ...Object.fromEntries(books.map((book) => [book.id, book])),
    }));
  }

  private booksFor(ids: string[]): Book[] {
    const entities = this.entitiesState();
    return ids
      .map((id) => entities[id])
      .filter((book): book is Book => book != null);
  }
}
