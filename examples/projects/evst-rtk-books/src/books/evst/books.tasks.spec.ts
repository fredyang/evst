import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Book } from "../model/book";

const services = vi.hoisted(() => ({
  api: { search: vi.fn(), retrieve: vi.fn() },
  storage: { load: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

vi.mock("../../services/google-books", () => ({
  googleBooksApi: services.api,
}));
vi.mock("../../services/book-storage", () => ({
  bookStorage: services.storage,
}));

const book: Book = {
  id: "one",
  title: "Book",
  authors: [],
  description: "",
  cover: "",
};

let books: typeof import("../../books");
let runtime: typeof import("@evst/rtk");
let auth: typeof import("../../auth/evst/auth.events");

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  runtime = await import("@evst/rtk");
  books = await import("../../books");
  auth = await import("../../auth/evst/auth.events");
  services.api.search.mockResolvedValue([book]);
  services.api.retrieve.mockResolvedValue(book);
  services.storage.load.mockReturnValue([]);
});

afterEach(() => {
  runtime.clearEvstStore();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function setup() {
  return runtime.createEvst({
    states: [books.booksState],
    tasks: [books.booksTasks],
  }).store;
}

it("trims query text before sending it to the API", async () => {
  const store = setup();
  books.fromFindBookPage.searchQueryChanged.publish({ query: "  react  " });
  await vi.advanceTimersByTimeAsync(500);
  expect(services.api.search).toHaveBeenCalledExactlyOnceWith("react");
  expect(books.booksViews.results(store.getState())).toEqual([book]);
});

it("keeps newer search results when an older request finishes later", async () => {
  let finish!: (value: Book[]) => void;
  services.api.search.mockImplementationOnce(
    () =>
      new Promise<Book[]>((resolve) => {
        finish = resolve;
      }),
  );
  const store = setup();
  books.fromFindBookPage.searchQueryChanged.publish({ query: "old" });
  await vi.advanceTimersByTimeAsync(500);
  const newerBook = { ...book, id: "new", title: "New result" };
  services.api.search.mockResolvedValueOnce([newerBook]);
  books.fromFindBookPage.searchQueryChanged.publish({ query: "new" });
  await vi.advanceTimersByTimeAsync(500);
  finish([book]);
  await vi.advanceTimersByTimeAsync(0);
  expect(books.booksViews.results(store.getState())).toEqual([newerBook]);
  expect(books.booksViews.books(store.getState()).entities.one).toBeUndefined();
});

it("discards old detail responses after another book is selected", async () => {
  let finish!: (value: Book) => void;
  services.api.retrieve.mockImplementationOnce(
    () =>
      new Promise<Book>((resolve) => {
        finish = resolve;
      }),
  );
  const store = setup();
  books.fromViewBookPage.selected.publish({ id: "one" });
  const newerBook = { ...book, id: "two" };
  services.api.retrieve.mockResolvedValueOnce(newerBook);
  books.fromViewBookPage.selected.publish({ id: "two" });
  await vi.advanceTimersByTimeAsync(0);
  finish(book);
  await vi.advanceTimersByTimeAsync(0);
  expect(books.booksViews.selectedBook(store.getState())).toEqual(newerBook);
  expect(books.booksViews.books(store.getState()).entities.one).toBeUndefined();
});

it("does not reread a collection already loaded", () => {
  setup();
  books.fromCollectionPage.entered.publish();
  books.fromCollectionPage.entered.publish();
  expect(services.storage.load).toHaveBeenCalledOnce();
});

it("uses a readable fallback for a non-Error API rejection", async () => {
  const store = setup();
  services.api.search.mockRejectedValueOnce("failed");
  books.fromFindBookPage.searchQueryChanged.publish({ query: "react" });
  await vi.advanceTimersByTimeAsync(500);
  expect(books.booksViews.search(store.getState()).error).toBe(
    "Unexpected error. Please try again.",
  );
});

it("updates query immediately but searches only after typing pauses", async () => {
  const store = setup();
  books.fromFindBookPage.searchQueryChanged.publish({ query: "r" });
  await vi.advanceTimersByTimeAsync(300);
  books.fromFindBookPage.searchQueryChanged.publish({ query: "react" });
  expect(books.booksViews.search(store.getState()).query).toBe("react");
  await vi.advanceTimersByTimeAsync(499);
  expect(services.api.search).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(services.api.search).toHaveBeenCalledExactlyOnceWith("react");
  expect(books.booksViews.results(store.getState())).toEqual([book]);
});

it("reports API failures and ends loading", async () => {
  const store = setup();
  services.api.search.mockRejectedValueOnce(new Error("Unavailable"));
  books.fromFindBookPage.searchQueryChanged.publish({ query: "react" });
  await vi.advanceTimersByTimeAsync(500);
  expect(books.booksViews.search(store.getState())).toMatchObject({
    loading: false,
    error: "Unavailable",
    ids: [],
  });
});

it("clearing the query cancels pending searches", async () => {
  const store = setup();
  books.fromFindBookPage.searchQueryChanged.publish({ query: "react" });
  books.fromFindBookPage.searchQueryChanged.publish({ query: "" });
  await vi.advanceTimersByTimeAsync(500);
  expect(services.api.search).not.toHaveBeenCalled();
  expect(books.booksViews.search(store.getState())).toMatchObject({
    loading: false,
    ids: [],
  });
});

it("discards a stale result after the query is cleared", async () => {
  let finish!: (value: Book[]) => void;
  services.api.search.mockImplementationOnce(
    () =>
      new Promise<Book[]>((resolve) => {
        finish = resolve;
      }),
  );
  const store = setup();
  books.fromFindBookPage.searchQueryChanged.publish({ query: "old" });
  await vi.advanceTimersByTimeAsync(500);
  books.fromFindBookPage.searchQueryChanged.publish({ query: "" });
  finish([book]);
  await vi.advanceTimersByTimeAsync(0);
  expect(books.booksViews.results(store.getState())).toEqual([]);
});

it("retrieves details, reuses cached books, and reports failures", async () => {
  const store = setup();
  books.fromViewBookPage.selected.publish({ id: "one" });
  await vi.advanceTimersByTimeAsync(0);
  expect(books.booksViews.selectedBook(store.getState())).toEqual(book);
  books.fromViewBookPage.selected.publish({ id: "one" });
  expect(services.api.retrieve).toHaveBeenCalledTimes(1);
  services.api.retrieve.mockRejectedValueOnce(new Error("Unavailable"));
  books.fromViewBookPage.selected.publish({ id: "missing" });
  await vi.advanceTimersByTimeAsync(0);
  expect(books.booksViews.detail(store.getState()).error).toBe("Unavailable");
});

it("loads collections, persists changes, and rolls back failed writes", () => {
  const store = setup();
  services.storage.load.mockReturnValue([book]);
  books.fromCollectionPage.entered.publish();
  expect(books.booksViews.collectionBooks(store.getState())).toEqual([book]);
  services.storage.remove.mockImplementationOnce(() => {
    throw new Error("Storage full");
  });
  books.fromSelectedBookPage.removeBook.publish({ book });
  expect(books.booksViews.collectionBooks(store.getState())).toEqual([book]);
  expect(books.booksViews.collection(store.getState()).error).toBe(
    "Storage full",
  );
  services.storage.add.mockImplementationOnce(() => {
    throw new Error("Storage full");
  });
  books.fromSelectedBookPage.addBook.publish({ book: { ...book, id: "two" } });
  expect(books.booksViews.collection(store.getState()).ids).toEqual(["one"]);
  books.fromSelectedBookPage.removeBook.publish({ book });
  expect(books.booksViews.collectionBooks(store.getState())).toEqual([]);
  books.fromSelectedBookPage.addBook.publish({ book });
  expect(books.booksViews.collectionBooks(store.getState())).toEqual([book]);
});

it("reports invalid saved collections and stops loading", () => {
  const store = setup();
  services.storage.load.mockImplementationOnce(() => {
    throw new Error("Saved collection is invalid.");
  });
  books.fromCollectionPage.entered.publish();
  expect(books.booksViews.collection(store.getState())).toMatchObject({
    loading: false,
    loaded: false,
    error: "Saved collection is invalid.",
  });
});

it("resets Books on logout and reloads persisted collection", () => {
  const store = setup();
  services.storage.load.mockReturnValue([book]);
  books.fromCollectionPage.entered.publish();
  auth.fromAuth.logout.publish();
  expect(books.booksViews.root(store.getState())).toEqual(books.initialState);
  books.fromCollectionPage.entered.publish();
  expect(books.booksViews.collectionBooks(store.getState())).toEqual([book]);
});
