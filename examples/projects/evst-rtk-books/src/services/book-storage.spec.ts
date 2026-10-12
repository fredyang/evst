// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bookStorage } from "./book-storage";
import type { Book } from "../books/model/book";

const key = "evst-react-books.collection.v2";
const book: Book = {
  id: "one",
  title: "Book",
  authors: [],
  description: "",
  cover: "",
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("loads an empty collection and persists, updates, and removes full records", () => {
  expect(bookStorage.load()).toEqual([]);
  bookStorage.add(book);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([book]);
  bookStorage.add({ ...book, title: "Updated" });
  expect(bookStorage.load()).toEqual([{ ...book, title: "Updated" }]);
  bookStorage.remove(book);
  expect(bookStorage.load()).toEqual([]);
});

it("rejects malformed JSON and invalid saved records", () => {
  localStorage.setItem(key, "broken");
  expect(() => bookStorage.load()).toThrow();
  localStorage.setItem(key, JSON.stringify([{ id: "one" }]));
  expect(() => bookStorage.load()).toThrow("Saved collection is invalid.");
});

it("propagates browser storage failures to task handlers", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage full");
  });
  expect(() => bookStorage.add(book)).toThrow("Storage full");
  expect(bookStorage.load()).toEqual([]);
});
