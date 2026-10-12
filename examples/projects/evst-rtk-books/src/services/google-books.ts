import { GOOGLE_BOOKS_API_KEY } from "../config/google-books-api-key";

import type { Book } from "../books/model/book";

function normalize(value: unknown): Book {
  const volume = value as {
    id?: string;
    volumeInfo?: {
      title?: string;
      authors?: string[];
      description?: string;
      imageLinks?: { thumbnail?: string };
    };
  };
  if (!volume || typeof volume.id !== "string" || !volume.volumeInfo)
    throw new Error("Invalid Google Books response.");
  const info = volume.volumeInfo;
  return {
    id: volume.id,
    title: info.title ?? "Untitled",
    authors: info.authors ?? [],
    description: (info.description ?? "").replace(/<[^>]*>/g, ""),
    cover: (info.imageLinks?.thumbnail ?? "").replace(/^http:/, "https:"),
  };
}

async function request(
  path: string,
  signal?: AbortSignal,
  query?: string,
): Promise<unknown> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes" + path);
  if (query) {
    url.searchParams.set("q", query);
    url.searchParams.set("orderBy", "newest");
    url.searchParams.set("maxResults", "20");
  }
  if (GOOGLE_BOOKS_API_KEY) url.searchParams.set("key", GOOGLE_BOOKS_API_KEY);
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(
      `Google Books request failed (${response.status}). Please try again.`,
    );
  return response.json();
}

export const googleBooksApi = {
  async search(query: string, signal?: AbortSignal): Promise<Book[]> {
    const data = (await request("", signal, query)) as { items?: unknown[] };
    return (data.items ?? []).map(normalize);
  },
  async retrieve(id: string, signal?: AbortSignal): Promise<Book> {
    return normalize(await request("/" + encodeURIComponent(id), signal));
  },
};
