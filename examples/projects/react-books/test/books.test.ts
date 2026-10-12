import { afterEach, expect, it, vi } from "vitest";
import { clearEvstStore, createEvstStore } from "@evst/react";
import {
  booksState,
  booksViews,
  createBooksTasks,
  initialState,
  fromCollectionPage,
  fromFindBookPage,
  fromSelectedBookPage,
  fromViewBookPage,
  type Book,
} from "../src/books";
import { createBookStorage } from "../src/services/book-storage";
import { createGoogleBooksApi } from "../src/services/google-books";
import { fromAuth } from "../src/auth/evst/auth.events";
const book: Book = {
  id: "one",
  title: "Book",
  authors: [],
  description: "",
  cover: "",
};
const api = () => ({
  search: vi.fn(async (_query: string, _signal?: AbortSignal) => [book]),
  retrieve: vi.fn(async (_id: string, _signal?: AbortSignal) => book),
});
function setup(
  service = api(),
  storage = createBookStorage(() => ({
    getItem: () => null,
    setItem: () => {},
  })),
) {
  const store = createEvstStore({
    features: [booksState],
    tasks: [createBooksTasks(service, storage)],
  });
  return { store, service };
}
afterEach(() => {
  clearEvstStore();
  vi.useRealTimers();
});

it("debounces search requests and clears loading when the query is cleared", async () => {
  vi.useFakeTimers();
  const { store, service } = setup();
  fromFindBookPage.searchQueryChanged.publish({ query: "new" });
  expect(booksViews.search(store.getState()).query).toBe("new");
  expect(service.search).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(300);
  expect(service.search).toHaveBeenCalledTimes(1);
  expect(service.search.mock.calls[0]?.[0]).toBe("new");
  await vi.advanceTimersByTimeAsync(0);
  expect(booksViews.results(store.getState())).toEqual([book]);
  fromFindBookPage.searchQueryChanged.publish({ query: "" });
  expect(booksViews.search(store.getState())).toMatchObject({
    ids: [],
    loading: false,
  });
});

it("ends search loading and exposes request failures", async () => {
  vi.useFakeTimers();
  const { store, service } = setup();
  service.search.mockRejectedValueOnce(new Error("Quota exceeded"));
  fromFindBookPage.searchQueryChanged.publish({ query: "react" });
  await vi.advanceTimersByTimeAsync(300);
  expect(booksViews.search(store.getState())).toMatchObject({
    loading: false,
    error: "Quota exceeded",
    ids: [],
  });
});

it("ignores a late search result after the query is cleared", async () => {
  vi.useFakeTimers();
  let finish!: (value: Book[]) => void;
  const service = api();
  service.search = vi.fn(
    (_query?: string, _signal?: AbortSignal) =>
      new Promise<Book[]>((resolve) => {
        finish = resolve;
      }),
  );
  const { store } = setup(service);
  fromFindBookPage.searchQueryChanged.publish({ query: "old" });
  await vi.advanceTimersByTimeAsync(300);
  fromFindBookPage.searchQueryChanged.publish({ query: "" });
  finish([book]);
  await vi.advanceTimersByTimeAsync(0);
  expect(booksViews.results(store.getState())).toEqual([]);
});

it("retrieves uncached detail links and reports API failures", async () => {
  const { store, service } = setup();
  fromViewBookPage.selected.publish({ id: "one" });
  await vi.waitFor(() =>
    expect(booksViews.selectedBook(store.getState())).toEqual(book),
  );
  service.retrieve.mockRejectedValueOnce(new Error("Unavailable"));
  fromViewBookPage.selected.publish({ id: "missing" });
  await vi.waitFor(() =>
    expect(booksViews.detail(store.getState()).error).toBe("Unavailable"),
  );
});

it("persists full books across stores and rolls back failed writes", () => {
  let saved: string | null = null;
  let fail = false;
  const storage = createBookStorage(() => ({
    getItem: () => saved,
    setItem: (_key, value) => {
      if (fail) throw new Error("Storage full");
      saved = value;
    },
  }));
  let { store } = setup(api(), storage);
  fromCollectionPage.entered.publish();
  fromSelectedBookPage.addBook.publish({ book });
  clearEvstStore();
  store = setup(api(), storage).store;
  fromCollectionPage.entered.publish();
  expect(booksViews.collectionBooks(store.getState())).toEqual([book]);
  fail = true;
  fromSelectedBookPage.removeBook.publish({ book });
  expect(booksViews.collectionBooks(store.getState())).toEqual([book]);
  expect(booksViews.collection(store.getState()).error).toBe("Storage full");
  fromSelectedBookPage.addBook.publish({ book: { ...book, id: "two" } });
  expect(booksViews.collection(store.getState()).ids).toEqual(["one"]);
});

it("reports malformed saved data without leaving collection loading", () => {
  const { store } = setup(
    api(),
    createBookStorage(() => ({ getItem: () => "broken", setItem: () => {} })),
  );
  fromCollectionPage.entered.publish();
  expect(booksViews.collection(store.getState())).toMatchObject({
    loaded: false,
    loading: false,
  });
  expect(booksViews.collection(store.getState()).error).not.toBe("");
});

it("resets lazy Books state on logout and reloads the persisted collection", () => {
  let saved: string | null = null;
  const storage = createBookStorage(() => ({
    getItem: () => saved,
    setItem: (_key, value) => {
      saved = value;
    },
  }));
  storage.add(book);
  const { store } = setup(api(), storage);

  fromCollectionPage.entered.publish();
  expect(booksViews.collectionBooks(store.getState())).toEqual([book]);

  fromFindBookPage.searchQueryChanged.publish({ query: "react" });
  expect(booksViews.search(store.getState()).query).toBe("react");

  fromAuth.logout.publish();
  expect(booksViews.search(store.getState())).toEqual(initialState.search);
  expect(booksViews.collection(store.getState())).toEqual(
    initialState.collection,
  );
  expect(booksViews.books(store.getState()).ids).toEqual([]);

  fromCollectionPage.entered.publish();
  expect(booksViews.collectionBooks(store.getState())).toEqual([book]);
});

it("uses the Google Books endpoint, normalizes results, and rejects HTTP failures", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        items: [{ id: "one", volumeInfo: { title: "Book" } }],
      }),
    ),
  );
  const service = createGoogleBooksApi(fetcher, "test-key");
  const signal = new AbortController().signal;
  expect(await service.search("react & redux", signal)).toEqual([book]);
  const url = fetcher.mock.calls[0][0] as URL;
  expect(url.origin).toBe("https://www.googleapis.com");
  expect(url.searchParams.get("q")).toBe("react & redux");
  expect(fetcher.mock.calls[0][1]?.signal).toBe(signal);
  fetcher.mockResolvedValueOnce(new Response("", { status: 429 }));
  await expect(service.retrieve("one", signal)).rejects.toThrow("429");
});
