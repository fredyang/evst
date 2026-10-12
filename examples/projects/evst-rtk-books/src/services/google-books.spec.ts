import { afterEach, expect, it, vi } from "vitest";
import { googleBooksApi } from "./google-books";

vi.mock("../config/google-books-api-key", () => ({
  GOOGLE_BOOKS_API_KEY: "test-key",
}));

afterEach(() => vi.unstubAllGlobals());

it("encodes queries, passes cancellation signals, and normalizes book metadata", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        items: [
          {
            id: "one",
            volumeInfo: {
              title: "Book",
              description: "<p>Description</p>",
              imageLinks: { thumbnail: "http://example.com/cover" },
            },
          },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  expect(await googleBooksApi.search("react & redux", signal)).toEqual([
    {
      id: "one",
      title: "Book",
      authors: [],
      description: "Description",
      cover: "https://example.com/cover",
    },
  ]);
  const url = fetcher.mock.calls[0][0] as URL;
  expect(url.origin + url.pathname).toBe(
    "https://www.googleapis.com/books/v1/volumes",
  );
  expect(url.searchParams.get("q")).toBe("react & redux");
  expect(url.searchParams.get("key")).toBe("test-key");
  expect(fetcher.mock.calls[0][1]?.signal).toBe(signal);
});

it("returns an empty search result when items are absent", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  expect(await googleBooksApi.search("missing")).toEqual([]);
});

it("encodes volume IDs and rejects HTTP errors and invalid metadata", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("", { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(googleBooksApi.retrieve("a/b")).rejects.toThrow("503");
  expect((fetcher.mock.calls[0][0] as URL).pathname).toBe(
    "/books/v1/volumes/a%2Fb",
  );
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id: "one" })));
  await expect(googleBooksApi.retrieve("one")).rejects.toThrow(
    "Invalid Google Books response.",
  );
});
